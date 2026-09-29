// discovery/as-is.mjs — the as-is record: how the process ran ONCE, in the words of the person who ran
// it, reconstructed from one named past case (ticket #486, epic #295; the idea is Ryan Singer's, via
// #486 — three artifacts kept apart: the as-is business logic from concrete past cases, facts only; the
// product concept; the engineering). Format → discovery/README.md §The as-is record.
//
// It is prd-projection.mjs's and proposals.mjs's SIBLING, not their extension. prd.md is the product
// concept and the prototype is built from it, so neither is the truth about how the work runs today.
// This page is kept beside them and folds ONE answer line and run.json's head, nothing else: the
// latest `banked` line in answers.jsonl on CASE_QUESTION, the one bank question that asks for a
// specific past instance. Latest means LAST IN FILE ORDER, not the highest ref, because answers.jsonl
// is append-only and a re-ask appends.
//
// A PROJECTION IS NOT A VERB. This module imports nothing from ops.mjs and adds, renames or
// reinterprets nothing in OPS, PARAMS or the applier's switch, so it does not take the epic's op-verb
// lock (ops.mjs's header, "A PURE READ IS NOT A VERB"). It imports three containment helpers from
// prd-projection.mjs in ONE direction, and build-checks case 48.1 asserts prd-projection.mjs never names
// this module.
//
// FLAGGED AND KEPT, NEVER DROPPED. Every sentence of the case reaches the page. A sentence phrased as a
// want or in the conditional is marked, because the owner judges it by reading and a fold that deleted
// it would be making that judgement. The rule is the bank's own weakAnswer for CASE_QUESTION — "any
// sentence in the conditional" — widened to the grammar of a want; WANT_RULES below is that rule,
// written out. The page quotes the weakAnswer from the bank rather than retyping it.
//
// THE FIVE ELEMENTS ARE A READING LENS, NOT A SORT. The page names what to read the case for (triggers,
// steps, people, information needed, hand-offs) and sorts no sentence into them: sorting prose is a
// judgement, and a judgement presented on this page would be agent output the honesty contract does not
// allow without a real run.
//
// CANNOT REACH: whether an answer names a REAL instance (a habitual answer such as graded-opus-a a10
// passes as a case — the owner reads that), the five elements (the page names them as the reading lens
// and sorts nothing), a want phrased without any of the seven rules' words, a fact flagged as
// conditional because it reports a past or quoted modal (couldn't find, said she would, a person named
// Will — the modal rule is lexical and over-flags; 48.4 pins one such sentence), and the drawer button's
// click (portal.js has no CI runner; 48.8 is a source pin).
//
// TWO HALVES, proposals.mjs's split:
//   · a PURE core — CASE_QUESTION, WANT_RULES, splitSentences, flagSentence, caseOf, projectAsIs. No
//     filesystem, no clock. Same input, byte-identical output; the only ISO stamp on the page is
//     run.startedAt.
//   · a THIN filesystem shell — writeAsIs and the CLI guard.
//
// `as-is.md` IS REGENERATED, NOT REFUSED — proposals.md's rule, not prd.md's. writePrd refuses to
// overwrite because prd.md is generated and then hand-edited; nothing hand-edits this file (a flagged
// line is the owner's to judge by reading, not to delete), so a hand edit here is lost. The guard is
// build-checks case 48.7's byte compare.
//
// Human text reaches the page ONLY through blockquote(); every run field goes through fold().
//
// Standalone:  node discovery/as-is.mjs <slug> [--stdout]
//              node discovery/as-is.mjs --root <dir> [--stdout]
// Paths resolve from this module (NOT cwd).

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { questionById } from "./bank.mjs";
import { blockquote, fold, readPackage } from "./prd-projection.mjs";

// The one bank question that asks for a named past case (discovery/bank.mjs).
export const CASE_QUESTION = "s2-last-time-show-me";

// The flag rule, in this order. `kind` is what the page says; `id` is what the table and the gate name.
export const WANT_RULES = Object.freeze([
  // A stated wish. `wanted` is deliberately missed: the past tense is a fact of the case.
  Object.freeze({ id: "want-verb", kind: "want", re: /\b(?:wants?|wish(?:es)?|hope|hopes|ideally|if only)\b/i }),
  // A polite want — "we'd like", "I would prefer".
  Object.freeze({ id: "would-like", kind: "want", re: /\b(?:I|we|they|you)(?:'d| would) (?:like|love|prefer)\b/i }),
  // A prescription, not a report of what happened.
  Object.freeze({ id: "should", kind: "want", re: /\bshould\b/i }),
  // A present-tense need; "needed" is past and a fact.
  Object.freeze({ id: "need-present", kind: "want", re: /\b(?:I|we|they|you) need\b|\bneeds? (?:a way|to be able)\b/i }),
  // An evaluation of a thing that does not exist yet.
  Object.freeze({ id: "would-be-nice", kind: "want", re: /\bit would be (?:nice|good|great|better|easier)\b/i }),
  // The weakAnswer's own words: any sentence in the conditional (or a prediction).
  Object.freeze({ id: "modal", kind: "conditional", re: /\b(?:would|could|might|will)(?:n't)?\b/i }),
  // A prediction stated as an expectation, not an observation.
  Object.freeze({ id: "expect", kind: "conditional", re: /\bI expect\b/i }),
]);

// Paragraphs on blank lines (any line ending), then sentences on terminal punctuation followed by a
// capital or digit — so `7.40` and `v7 FINAL (2).xlsx` stay inside their sentence, and a title
// abbreviation does not: "Mr. Patel signed it." splits after "Mr.", which only shifts the numbering.
// Total: a non-string is stringified, and blank text gives [].
export function splitSentences(text) {
  return String(text).split(/\r\n|\r|\n/).join("\n").split(/\n\s*\n/)
    .flatMap((p) => p.replace(/\s+/g, " ").trim().split(/(?<=[.!?]["”)]?)\s+(?=["“(]?[A-Z0-9])/))
    .filter(Boolean);
}

// The ids of every rule that fires, in WANT_RULES order; [] for none.
export function flagSentence(s) {
  return WANT_RULES.filter((r) => r.re.test(String(s))).map((r) => r.id);
}

// The case, as a value. Total over junk, like ops.mjs's auditExchanges: a non-array reads as [], and a
// line that is not an object, not `banked` or not on CASE_QUESTION is ignored.
export function caseOf(answers) {
  const lines = Array.isArray(answers)
    ? answers.filter((a) => a && typeof a === "object" && a.kind === "banked" && a.question_id === CASE_QUESTION)
    : [];
  const anchor = lines.length ? lines[lines.length - 1] : null;
  const earlier = lines.slice(0, -1).map((a) => a.ref ?? null);
  const text = anchor && typeof anchor.text === "string" ? anchor.text : "";
  const sentences = splitSentences(text).map((t, i) => ({ n: i + 1, text: t, flags: flagSentence(t) }));
  return { question: questionById(CASE_QUESTION), anchor, earlier, sentences };
}

// prd-projection.mjs's `field`, the copy proposals.mjs also keeps: module-private there, and every value
// it can be handed goes through the exported fold.
const field = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() === "" ? "—" : fold(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "—";
};

const kindsOf = (flags) => ["want", "conditional"].filter((k) => WANT_RULES.some((r) => r.kind === k && flags.includes(r.id)));

// { run, answers } → the page. Extra keys are ignored.
export function projectAsIs(pkg) {
  const run = pkg && typeof pkg.run === "object" && pkg.run !== null ? pkg.run : {};
  const c = caseOf(pkg ? pkg.answers : undefined);
  const flagged = c.sentences.filter((s) => s.flags.length);
  const out = [];
  out.push(`# ${field(run.slug)} — as-is, projected from a discovery run`);
  out.push("");
  out.push("> **The answer to the question that asks for one named past case — how the process ran the last "
    + "time, in the person's own words.** This page cannot tell whether the answer names a real instance; "
    + `read it for that. Folded from [\`${field(run.root)}\`](./): the latest \`banked\` line in `
    + `\`answers.jsonl\` on \`${CASE_QUESTION}\`, and \`run.json\`'s head — nothing else. Generated by `
    + "`discovery/as-is.mjs` (#486). It is ground truth for whoever builds next, kept apart from `prd.md` "
    + "and the prototype, because the prototype is not the truth. A sentence phrased as a want or in the "
    + "conditional is **flagged and kept, never dropped**. **Regenerated by the CLI, so a hand edit is lost.**");
  out.push("");
  out.push(`**Run** — \`${field(run.slug)}\` · ${field(run.provenance)} (${field(run.label)}) · depth ${field(run.depth)} · started ${field(run.startedAt)}`);
  out.push("");
  out.push("## How to read it");
  out.push("");
  out.push("Read the case for five things: what triggered it, the steps taken, the people involved, the "
    + "information each step needed, and where the work changed hands. This page does not sort the "
    + "sentences into those five: sorting prose is a judgement, and this page is a fold.");
  out.push("");
  out.push("## The case");
  out.push("");
  if (!c.anchor) {
    out.push(`_No past case in this run: \`${CASE_QUESTION}\` was not answered (depth ${field(run.depth)}). `
      + "The as-is record is reconstructed from one named past case, so this run has none._");
  } else {
    out.push(`\`${field(c.anchor.ref)}\` · \`${CASE_QUESTION}\` — ${fold(c.question.text)}`);
    if (c.earlier.length) {
      out.push("");
      out.push(`Earlier answers to the same question, superseded by this one: ${c.earlier.map((r) => `\`${field(r)}\``).join(" · ")}.`);
    }
    if (!c.sentences.length) {
      out.push("");
      out.push(blockquote(c.anchor.text));
    }
    for (const s of c.sentences) {
      out.push("");
      out.push(s.flags.length ? `**${s.n} · flagged: ${kindsOf(s.flags).join(" + ")} (${s.flags.join(" + ")})**` : `**${s.n}**`);
      out.push("");
      out.push(blockquote(s.text));
    }
  }
  out.push("");
  out.push("## Flagged lines");
  out.push("");
  if (!c.anchor) {
    out.push("_Nothing to flag._");
  } else {
    const k = flagged.length, m = c.sentences.length;
    const rule = splitSentences(c.question.weakAnswer)[0];
    out.push(`${k} of ${m} sentence${m === 1 ? "" : "s"} ${k === 1 ? "is" : "are"} flagged. The rule is the `
      + `bank's weak-answer note for this question — "${fold(rule)}" — widened to the grammar of a want. `
      + "Flagged sentences stay in the case above.");
    if (k) {
      out.push("");
      out.push("| Sentence | Kind | Rules |");
      out.push("|---|---|---|");
      for (const s of flagged) out.push(`| ${s.n} | ${kindsOf(s.flags).join(" + ")} | ${s.flags.join(" + ")} |`);
    }
  }
  out.push("");
  return out.join("\n");
}

// ---------------------------------------------------------------------------------------------------
// The filesystem shell. Nothing below decides what the page says.
// ---------------------------------------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Project and write <root>/as-is.md. ALWAYS OVERWRITES: nothing hand-edits this file, and the guard is
// build-checks case 48.7's byte compare — writeProposalsMd's rule, not writePrd's.
export function writeAsIs(root) {
  const pkg = readPackage(root);
  const md = projectAsIs(pkg);
  const path = join(root, "as-is.md");
  writeFileSync(path, md);
  const c = caseOf(pkg.answers);
  return { path, bytes: Buffer.byteLength(md, "utf8"), wrote: true, slug: pkg.run.slug, ref: c.anchor ? c.anchor.ref ?? null : null, sentences: c.sentences.length, flagged: c.sentences.filter((s) => s.flags.length).length };
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains a space, which import.meta.url
// percent-encodes — the naive comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const rootAt = argv.indexOf("--root");
  const rootArg = rootAt === -1 ? null : (argv[rootAt + 1] ?? null);
  const slug = argv.find((a, i) => !a.startsWith("--") && !(rootAt !== -1 && i === rootAt + 1)) ?? null;
  try {
    if (rootAt !== -1 && (rootArg === null || rootArg.startsWith("--")))
      throw new Error(`as-is: --root takes a directory — the next argument is ${rootArg === null ? "absent" : JSON.stringify(rootArg)}`);
    if (rootArg && slug)
      throw new Error(`as-is: give a slug OR --root, not both — got slug ${JSON.stringify(slug)} and --root ${JSON.stringify(rootArg)}`);
    if (!rootArg && !slug)
      throw new Error("as-is: usage: node discovery/as-is.mjs <slug> [--stdout]  |  --root <dir> [--stdout]");
    const root = rootArg ? resolve(rootArg) : join(ROOT, "discovery", slug);
    if (argv.includes("--stdout")) {
      process.stdout.write(projectAsIs(readPackage(root)));
    } else {
      const r = writeAsIs(root);
      console.log(`as-is ✓  ${r.slug} → case ${r.ref ?? "none"}, ${r.sentences} sentence(s), ${r.flagged} flagged (${rootArg ? r.path : `discovery/${slug}/as-is.md`})`);
    }
  } catch (e) {
    console.error(`as-is ✗  ${e.message}`);
    process.exit(1);
  }
}
