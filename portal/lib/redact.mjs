// portal/lib/redact.mjs — secret-pattern redaction (epic #1, ticket #25).
// Honesty contract: redaction happens at record time inside the trace's only legal
// producer (portal/lib/trace-recorder.mjs), before any byte hits disk — "exactly as
// recorded" means post-redaction. The rules that ran are named in meta.redaction;
// a redacted span reads [redacted:<rule>]. Pure, zero-dep — #13's runs reuse it.
//
// Known residual: a response capped by the recorder can cut a token mid-pattern,
// leaving a prefix no rule matches. Accepted (a truncated fragment), not engineered
// around.

// Ordered [name, pattern, replacement?] — order matters: block rules first,
// anthropic-key before the generic sk- rule (negative lookahead makes anthropic win
// by name). Replacement defaults to the plain [redacted:<name>] marker.
export const RULES = [
  ['private-key-block', /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ['anthropic-key', /\bsk-ant-[A-Za-z0-9_-]{10,}\b/g],
  ['openai-key', /\bsk-(?!ant-)[A-Za-z0-9_-]{20,}\b/g],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ['aws-access-key-id', /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  ['bearer-auth', /\bBearer\s+[A-Za-z0-9._~+\/=-]{20,}/g],
  // Group 1 = the var name + separator, group 2 = optional quote — both kept, so the
  // NAME stays visible in the trace and only the value goes. Case-insensitive with an
  // optional quote after the name, so JSON-shaped keys ("token": …) and lowercase/camel
  // keys (password:, apiKey:) are caught, not just SCREAMING_SNAKE env lines (PR #28).
  ['secretlike-assignment', /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_?KEY|PRIVATE_?KEY)[A-Z0-9_]*["']?\s*[:=]\s*)(["']?)[^\s"']{8,}\2/gi,
    '$1$2[redacted:secretlike-assignment]$2'],
];

export const RULE_NAMES = RULES.map(([n]) => n);

// Apply every rule to one string; report which rules hit. Uses .replace() only —
// a g-flag regex keeps lastIndex state across .test()/.exec() calls, but .replace()
// resets it internally, so hits are detected by before/after comparison (a replacement
// can never equal its match: no [redacted:…] marker matches a secret pattern).
export function redactString(s) {
  let value = String(s);
  const rules = [];
  for (const [name, re, replacement] of RULES) {
    const before = value;
    value = value.replace(re, replacement ?? `[redacted:${name}]`);
    if (value !== before) rules.push(name);
  }
  return { value, rules };
}

// Recurse objects/arrays, redact string leaves. Returns a NEW structure — never
// mutates the input (a hook's tool_input is shared with the run it observes).
export function redactDeep(v) {
  const rules = new Set();
  const walk = (x) => {
    if (typeof x === 'string') {
      const r = redactString(x);
      for (const n of r.rules) rules.add(n);
      return r.value;
    }
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(x)) out[k] = walk(val);
      return out;
    }
    return x;
  };
  return { value: walk(v), rules: [...rules] };
}
