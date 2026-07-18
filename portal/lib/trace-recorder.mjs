// portal/lib/trace-recorder.mjs — build-time trace recorder (epic #1, ticket #5).
// Architecture §Where it plugs in: the portal's Agent SDK dependency becomes the
// trace recorder. Wraps query() with PostToolUse + PostToolUseFailure hooks (tool
// steps: name + input + response + artifact pairing) and iterates the message loop
// (assistant text = the annotation layer; init/result = the meta + result lines).
// Emits the Trace JSONL documented in traces/README.md.
//
// Honesty contract (hard): this file is the ONLY producer of trace step content —
// trace content is never hand-written or hand-edited (curation lives in
// tooling/curate-trace.mjs and does selection + truncation only) — and it redacts
// secret patterns (portal/lib/redact.mjs) before any line is written; the rule
// names are recorded in meta.redaction.

import { query } from '@anthropic-ai/claude-agent-sdk';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_DIR } from './env.mjs';
import { redactDeep, redactString, RULE_NAMES } from './redact.mjs';

// Raw recorder response cap (keeps the raw file bounded; curation caps further).
const RESPONSE_CAP = 4000;
// A PIV phase marker line: the marker ALONE on its own line, anywhere in a text block.
// Models emit conversational preamble before the marker and sometimes several markers in
// one block; the "alone on its own line" contract (traces/README.md) is what matters, so
// this scans every line (m flag, g for matchAll) rather than anchoring to the block start.
const PIV_MARKER = /^[ \t]*\[\[piv:(plan|gate|implement|validate)\]\][ \t]*$/gm;

// Stringify + cap a tool_response; report whether we cut it.
function capResponse(resp) {
  const s = resp == null ? '' : typeof resp === 'string' ? resp : JSON.stringify(resp) ?? '';
  if (s.length <= RESPONSE_CAP) return { response: s, responseTruncated: false };
  return { response: s.slice(0, RESPONSE_CAP), responseTruncated: true };
}

// Record one real Agent SDK run to `outFile` as Trace JSONL. Returns run stats for
// the runner's ✓ line. `taskSummary` is the short human label stored in the meta;
// `task` is the full prompt handed to the agent. `cwd` defaults to the repo — a
// --dry run passes its scratch dir (query cwd, meta, artifact paths all follow it).
export async function recordRun({ slug, task, taskSummary, systemPrompt, model, maxTurns, allowedTools, tools, canUseTool, outFile, cwd = REPO_DIR }) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, ''); // start fresh; appendFileSync builds it up line by line

  let seq = 0;
  let currentPhase = null;
  const seenPhases = [];
  let nullPhaseSteps = 0;
  let artifacts = 0;
  let denials = 0;

  const now = () => new Date().toISOString();
  const write = (obj) => appendFileSync(outFile, JSON.stringify(obj) + '\n');

  // A tool step from a hook payload. ok=false carries the failure error; a successful
  // Write/Edit pairs the artifact it produced (relative to the run's cwd — the repo in
  // real runs) — the pairing the Trace definition demands. Text blocks and hook firings
  // share `seq`, so the file stays in true chronology — never buffer and sort (GOTCHA #3).
  // Every trace-derived string (input, response, error) is redacted before it is written;
  // the rules that hit land in step.redacted.
  const toolStep = (input, ok) => {
    if (currentPhase === null) nullPhaseSteps++;
    const { response, responseTruncated } = capResponse(input.tool_response);
    const rin = redactDeep(input.tool_input);
    const rresp = redactString(response);
    const hit = new Set([...rin.rules, ...rresp.rules]);
    const step = {
      type: 'step', seq: ++seq, ts: now(), phase: currentPhase, kind: 'tool',
      tool: input.tool_name, input: rin.value,
      ok, response: rresp.value, responseTruncated, toolUseId: input.tool_use_id,
    };
    if (!ok) {
      const rerr = redactDeep(input.error);
      step.error = rerr.value;
      for (const n of rerr.rules) hit.add(n);
    }
    if (hit.size) step.redacted = [...hit];
    if (ok && (input.tool_name === 'Write' || input.tool_name === 'Edit')) {
      // Artifact from the ORIGINAL input — a "[redacted:…]" file_path would break the
      // validator's artifact-exists check (the stored input above is the redacted one).
      const fp = input.tool_input?.file_path;
      if (fp) {
        step.artifact = { path: path.relative(cwd, path.resolve(cwd, fp)) };
        artifacts++;
      }
    }
    return step;
  };

  // Hook bodies wrapped in try/catch and always returning { continue: true }: a thrown
  // hook can interrupt the agent, so a recording bug must never alter the run it observes
  // (GOTCHA #2). PostToolUseFailure steps (ok:false) are kept — a failed check that gets
  // fixed IS the governance story (GOTCHA #4).
  const hook = (ok) => async (input) => {
    try { write(toolStep(input, ok)); }
    catch (e) { process.stderr.write(`trace-recorder: hook error (non-fatal): ${e.message}\n`); }
    return { continue: true };
  };

  // The permission layer's fast path can auto-allow "trivially safe" commands (e.g.
  // `true`) without ever consulting canUseTool, so canUseTool alone cannot enforce the
  // fence. PreToolUse hooks fire before EVERY tool execution, fast path or not — run the
  // same fence here and deny when it denies; an allow adds no opinion (the permission
  // flow, canUseTool included, still runs). Unlike the recording hooks this one MAY
  // alter the run — blocking out-of-fence calls is its job — and it fails CLOSED.
  const fenceHook = async (input) => {
    let deny = null;
    try {
      const verdict = await canUseTool(input.tool_name, input.tool_input);
      if (verdict.behavior === 'deny') deny = verdict.message;
    } catch (e) {
      deny = `fence error (fail closed): ${e.message}`;
    }
    if (deny === null) return { continue: true };
    // Record the denial as a step — "the agent tried something off-fence" belongs in the
    // trace (a PreToolUse deny fires no PostToolUse/Failure hook, so this is the only
    // record point; no double-record). No response/toolUseId — the tool never ran. The
    // write is try/caught so a recording failure still returns the deny (fail closed).
    try {
      if (currentPhase === null) nullPhaseSteps++;
      denials++;
      const rin = redactDeep(input.tool_input);
      const rerr = redactString(deny);
      const hit = new Set([...rin.rules, ...rerr.rules]);
      const step = {
        type: 'step', seq: ++seq, ts: now(), phase: currentPhase, kind: 'tool',
        tool: input.tool_name, input: rin.value, ok: false, denied: true, error: rerr.value,
      };
      if (hit.size) step.redacted = [...hit];
      write(step);
    } catch (e) {
      process.stderr.write(`trace-recorder: denial-record error (non-fatal): ${e.message}\n`);
    }
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: deny } };
  };

  const q = query({
    prompt: task,
    options: {
      cwd, model, maxTurns, systemPrompt, allowedTools, tools, canUseTool,
      hooks: {
        ...(canUseTool ? { PreToolUse: [{ hooks: [fenceHook] }] } : {}),
        PostToolUse:        [{ hooks: [hook(true)] }],
        PostToolUseFailure: [{ hooks: [hook(false)] }],
      },
    },
  });

  let result = null;
  try {
    for await (const msg of q) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        write({
          type: 'meta', version: 1, slug, task: taskSummary,
          label: 'Real run — raw, uncurated', model,
          sessionId: msg.session_id, startedAt: now(), cwd,
          // Recorded on EVERY run, hits or not: "what protection ran" is static and
          // known at init; per-step `redacted` arrays carry where it fired.
          redaction: { rules: RULE_NAMES },
        });
      } else if (msg.type === 'assistant') {
        for (const block of msg.message?.content || []) {
          if (block.type === 'text' && block.text) {
            // A block may carry preamble before its marker, or several markers at once;
            // record every phase in order and adopt the LAST as current (subsequent steps
            // follow it). The block-step is tagged with that phase — preamble folds into
            // the phase it introduces. Text is verbatim apart from redaction (markers
            // kept; curation strips) — narration can quote Bash stdout, so it is in
            // scope. Redact AFTER the marker scan: the scan must see the original block.
            const markers = [...block.text.matchAll(PIV_MARKER)];
            for (const mk of markers) if (!seenPhases.includes(mk[1])) seenPhases.push(mk[1]);
            if (markers.length) currentPhase = markers[markers.length - 1][1];
            if (currentPhase === null) nullPhaseSteps++;
            const rtext = redactString(block.text);
            const step = { type: 'step', seq: ++seq, ts: now(), phase: currentPhase, kind: 'text', text: rtext.value };
            if (rtext.rules.length) step.redacted = rtext.rules;
            write(step);
          }
        }
      } else if (msg.type === 'result') {
        result = {
          type: 'result', ok: msg.subtype === 'success',
          numTurns: msg.num_turns, durationMs: msg.duration_ms,
          totalCostUsd: msg.total_cost_usd, endedAt: now(),
        };
        write(result);
      }
    }
  } catch (e) {
    throw new Error(`${outFile}: recording failed — ${e.message}`);
  }

  if (!result) throw new Error(`${outFile}: run produced no result message — no trace to keep`);
  return { outFile, steps: seq, phases: seenPhases, nullPhaseSteps, artifacts, denials, ok: result.ok, totalCostUsd: result.totalCostUsd };
}
