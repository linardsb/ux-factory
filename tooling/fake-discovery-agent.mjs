// tooling/fake-discovery-agent.mjs — hand-written canon (this repo; not generated). A SCRIPTED stand-in
// for the model on a discovery turn (#498; .claude/plans/re-record-decision-after-build-498.md Task 2.4).
// Build-checks group 30 imports it; canvas-journey.mjs's pass B reaches it through the portal child's
// UXF_DISCOVERY_TRANSPORT env seam (portal/lib/discovery.mjs's one dynamic import, loadTransport).
//
// IT HAS portal/lib/discovery-transport.mjs's runDiscoveryTurn SIGNATURE and files through the REAL filing
// path, discovery.mjs's fileOp — the same function the real tool callback calls — so the applier, the
// append order and the listener are the shipped ones. It builds the real posture's prompt first, so a
// builder that throws on this turn's inputs throws here too (the #454 class). It refuses to run unless the
// package root is under the OS temp directory (never this repo, never the jobs folder), so its lines only
// ever land in a scratch package, even with UXF_DISCOVERY_TRANSPORT left exported in a shell — runTurn calls its
// assertRoot before the answer append too, so a refused root receives no answer line either. Its stats say
// transport "fake".
//
// ITS BEHAVIOUR IS FIXED: one record_decision on the turn's question, carrying the prior banked decision's
// level and parent (so the record keeps a valid shape with no model), then one text line. Banked and revisit
// turns only; an affordance or a park is refused by name.
//
// WHAT IT PROVES: runTurn's guards, the filing path, the transcript, run.json's stats and the drawer.
// CANNOT REACH (build-checks group 30 and gates.md carry the same clause): whether a MODEL files a decision, a
// flag or an open question on a revisit, the SDK's resume handling, and the real tool callback's isError
// wrapping — only the owner's paid turn and the transport's --preflight show those.
// Imports nothing from portal/node_modules, so group 30 can use it in CI.

import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendTranscript, fileOp, OPS, textLine, toolNameFor } from "../portal/lib/discovery.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let sessions = 0;

// fake-compose-agent.mjs's guard, on the package root: realpath both sides, refuse the repo, refuse anything
// not under the OS temp directory.
export function assertRoot(dir) {
  const real = (p) => { try { return realpathSync(p); } catch { return path.resolve(p); } };
  const root = real(dir);
  const tmp = real(tmpdir());
  if (root === REPO || root.startsWith(REPO + path.sep) || !root.startsWith(tmp + path.sep)) {
    throw new Error("fake-discovery-agent: the fake writes agent lines and must never touch a committed package — its root must be a scratch package under the OS temp directory");
  }
}

export async function runDiscoveryTurn({ root, head, question, answer, turn, posture, state, affordance = null, park = false, answers = [], tensions = [], onLine, fresh = false }) {
  assertRoot(root);
  // The real transport's prompt build, discarded: its throw is the evidence, not its text.
  posture.build({ question, answer, turn, ledger: state.current.ops, provenance: head.provenance, entryMode: head.entryMode ?? "blank-idea", answers, park, affordance, tensions });
  if (affordance !== null || park) throw new Error("fake-discovery-agent: it scripts a banked or revisit turn only — an affordance or a park needs a model");
  const prior = state.current.ops.findLast((r) => r.op === "record_decision" && r.params.question_id === question.id && r.params.off_script === false);
  fileOp({
    root, turn, state, onLine, op: "record_decision", questionId: question.id,
    args: {
      question_id: question.id, answer_ref: answer.ref, level: prior?.params.level ?? "business", parent_id: prior?.params.parent_id ?? null,
      evidence_refs: [], wrong_if: "Scripted by tooling/fake-discovery-agent.mjs — not a model's judgement.", off_script: false,
    },
  });
  onLine?.(appendTranscript(root, textLine({ turn, text: "Fake discovery agent (tooling/fake-discovery-agent.mjs): one scripted record_decision, no model." })));
  return {
    sessionId: fresh ? `fake-fresh-${++sessions}` : (head.sessionId ?? `fake-${++sessions}`),
    stats: { turn, numTurns: 2, durationMs: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, ok: true, postureFingerprint: posture.fingerprint, transport: "fake", ts: new Date().toISOString() },
    advertised: OPS.map(toolNameFor),
  };
}
