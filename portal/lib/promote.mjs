// portal/lib/promote.mjs — hand-written canon (this repo; not generated). PROMOTE: a group composed in a run becomes
// a proposal — admission's second entrance (epic #295 ticket #315, G17; docs/epics/canvas-design-import.architecture.md
// § Other eng-lead calls "Compose-and-name is the default; promote is admission"). One admission path, two entrances:
// what this writes is what an import writes, and portal/lib/ratify.mjs admits either.
//
// INVARIANTS — each one is asserted by build-checks group 50, not assumed:
//   1. NO SDK, NO MODEL. Node built-ins, the store, import-run's helpers and env only.
//   2. NOTHING IS WRITTEN OUTSIDE <pkg>/build/proposals/<name>/, and every target is resolved before the first byte.
//   3. THE DRAFTS ARE DETERMINISTIC AND SAY SO ON THEIR FIRST LINE — never an agent's.
//   4. THE OP IS APPENDED LAST, through saveRun, after every file is written; a second promote of one group refuses
//      before anything is written.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { foldLedger, groupFiles, loadBuild, loadDecisions, positionsOf, saveConflict, saveRun } from "./canvas-store.mjs";
import { REPO_DIR } from "./env.mjs";
import { jsonText, ratifyPrefill, underLock, underRoot } from "./import-run.mjs";

const DRAFTED = (group, run) => `drafted by portal/lib/promote.mjs from group ${group.id} (${group.name}), composed in run ${run} — not by an agent; props, states, behaviour and the accessibility model are the owner's at ratify (#313)`;

export function draftFromGroup({ name, group, run }) {
  const head = { component: name, status: "proposed", class: `vd-${name}`, props: {}, tokens: [], states: [], children: [] };
  const spec = [
    `<!-- ${DRAFTED(group, run)} -->`,
    "```json",
    JSON.stringify(head, null, 2),
    "```",
    "",
    "## Provenance",
    "",
    `- group: \`${group.id}\` (${group.name})`,
    `- run: \`${run}\``,
    `- composed from: \`${group.composedFrom?.frameId}\` parts ${(group.composedFrom?.partIds ?? []).map((i) => `\`${i}\``).join(", ")}`,
    ...group.parts.map((p) => `- ${p.id} · ${p.name}`),
    "",
    "## Props",
    "",
    "## States",
    "",
    "## Behaviour",
    "",
    "## Accessibility",
    "",
  ].join("\n");
  const css = [
    `/* ${DRAFTED(group, run)} */`,
    `/* ---------- ${name} (proposal ${name}, group ${group.id}) ---------- */`,
    `.vd-${name} {`,
    "  /* a composed group carries no contract token of its own — its parts do */",
    "}",
    "",
  ].join("\n");
  const template = `${JSON.stringify({ note: DRAFTED(group, run), compositions: [group.parts] }, null, 2)}\n`;
  return { "spec.md": spec, "block.css": css, "template.txt": template };
}

export function promoteName(groupName, { taken = [], vocabNames = [] } = {}) {
  const blocked = new Set([...taken, ...vocabNames]);
  if (!blocked.has(groupName)) return groupName;
  let n = 2;
  while (blocked.has(`${groupName}-${n}`)) n += 1;
  return `${groupName}-${n}`;
}

const vocabOf = (repoDir) => JSON.parse(readFileSync(path.join(repoDir, "handoff/verdant/vocabulary.json"), "utf8"));

export async function promoteGroup({ pkgRoot, base, groupId, repoDir = REPO_DIR, now }) {
  return underLock(async () => {
    const buildRoot = path.join(pkgRoot, "build");
    const conflict = saveConflict(buildRoot, base);
    if (conflict) throw new Error(conflict);
    const pkg = loadBuild(buildRoot);
    const { doc } = foldLedger(pkg?.ops ?? []);
    const group = doc.groups?.[groupId];
    if (!group) return { refused: { kind: "no-group", message: `No group ${JSON.stringify(groupId)} in this run.`, action: { label: "Save the group first" } } };
    const held = (doc.proposals ?? []).find((p) => p && p.groupId === groupId);
    if (held) return { refused: { kind: "already-promoted", message: `Group ${groupId} is already proposal ${held.name} (${held.status}).`, action: { label: "Open the proposal" } } };
    const run = path.basename(pkgRoot);
    const vocab = vocabOf(repoDir);
    const taken = existsSync(path.join(buildRoot, "proposals")) ? readdirSync(path.join(buildRoot, "proposals")) : [];
    const name = promoteName(group.name, { taken, vocabNames: Object.keys(vocab.components ?? {}) });
    const drafts = draftFromGroup({ name, group, run });
    const dir = underRoot(buildRoot, `proposals/${name}`);
    const targets = Object.fromEntries(["source.json", ...Object.keys(drafts)].map((f) => [f, underRoot(buildRoot, `proposals/${name}/${f}`)]));
    mkdirSync(dir, { recursive: true });
    writeFileSync(targets["source.json"], jsonText(groupFiles(doc, run)[`${groupId}.json`]));
    for (const [f, text] of Object.entries(drafts)) writeFileSync(targets[f], text);
    const { count } = saveRun(pkgRoot, {
      base: pkg.ops.length,
      ops: [{ op: "component.propose", params: { name, groupId, mode: 1 }, status: "applied" }],
      positions: positionsOf(pkg.canvas), decisions: loadDecisions(pkgRoot),
    }, now ? { now } : undefined);
    return { name, groupId, count, view: promoteView(pkgRoot, name, { repoDir }) };
  }, "a promote");
}

export function promoteView(pkgRoot, name, { repoDir = REPO_DIR } = {}) {
  const buildRoot = path.join(pkgRoot, "build");
  const src = underRoot(buildRoot, `proposals/${name}/source.json`);
  if (!existsSync(src)) throw new Error(`promote: no promoted proposal "${name}" in ${buildRoot}`);
  const source = JSON.parse(readFileSync(src, "utf8"));
  const held = (foldLedger(loadBuild(buildRoot)?.ops ?? []).doc.proposals ?? []).find((p) => p && p.name === name) ?? null;
  return {
    name, groupId: source.id, mode: 1, status: held?.status ?? "proposed",
    component: held?.status === "ratified" ? held.component : null,
    dir: `build/proposals/${name}/`, source,
    ratifyPrefill: ratifyPrefill(name, [], vocabOf(repoDir)),
    label: `composed in run ${source.provenance?.run} from group ${source.id} · drafted by portal/lib/promote.mjs, not by an agent`,
  };
}
