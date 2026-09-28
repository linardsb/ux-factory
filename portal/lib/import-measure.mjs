// portal/lib/import-measure.mjs — hand-written canon (this repo; not generated). THE LIVE FIDELITY
// MEASUREMENT: on the owner's click, the importer's own composition for the first imported part is
// rendered under the neutral pack by a SPAWNED headless Chromium (tooling/measure-render.mjs), at the
// scale the reference was exported at, and compared with imports/<id>.reference.png by
// import/fidelity.mjs's rung 6 (epic #295 ticket #474; docs/epics/canvas-design-import.architecture.md
// § Data model "The import record"; .claude/plans/import-live-fidelity-474.md D1–D8).
//
// INVARIANTS — each one is asserted by build-checks group 43 (43.1, 43.15), not assumed:
//   1. THE CHILD RENDERS, THIS MODULE MEASURES AND WRITES (D8). Playwright is never imported here,
//      statically or lazily — the renderer is a spawned `node` process, so the portal's dependencies stay
//      the Agent SDK and zod, and group 43 imports this module in CI with no portal/node_modules (D1).
//   2. NOTHING IS WRITTEN OUTSIDE THE BUILD ROOT — every target through import-run's underRoot.
//   3. A MEASUREMENT IS OF THE RECORD IT WAS TAKEN FROM: the record, mapping and template are re-read
//      after the render and compared; a change is a `stale` refusal and nothing is written.
//   4. A REFUSAL IS DATA with one action; a bug (a size mismatch, a record checkRecord refuses) throws.
//   5. ONLY THE FIRST PART IS MEASURED: the read exports `ids: [read[0]]` only, so compositions[0] ↔
//      ir.children[0] is the one pair with a reference. A null composition is a refusal, not a red (D7).
//
// THE SCALE IS READ, NEVER GUESSED (D4): the import transcript's export line records the call's input,
// so a record read after #474 says `scale: 1` (import-run's EXPORT_SCALE) and one read before it carries
// none, which means Brilliant's documented default, 2. The candidate renders at ceil(ref / scale) CSS px
// and is cropped top-left to the reference's exact size in memory (D4b), so no reference size is refused.

import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { decodePng, measureImages, sha256 } from "../../import/fidelity.mjs";
import { buildRecord, checkReferenceIndependence, projectRecord } from "../../import/report.mjs";
import { importView, isProposalName, jsonText, sortKeys, underLock, underRoot } from "./import-run.mjs";
import { REPO_DIR } from "./env.mjs";

// Both sides are flattened over this (D5). S3's reference page background (capture.txt:157); any colour
// works so long as both sides use it, and the record's source strings name it.
export const BACKDROP = Object.freeze([255, 255, 255]);
export const BACKDROP_HEX = "#ffffff";

// Brilliant's documented export default — the scale of every reference read before #474, whose export
// call passed none (import/fixtures/brilliant-live/tools-list.json → schemas.export.properties.scale).
export const LEGACY_SCALE = 2;
const SCALES = [1, 2, 3];

const RENDER_TIMEOUT_MS = () => Number(process.env.UXF_MEASURE_TIMEOUT_MS) || 60_000;
const MEASURE_AGAIN = { label: "Measure again", measure: true };
const IMPORT_AGAIN = { label: "Import it again from Brilliant", hint: "Select it in Brilliant, then Import selection" };

// CSS-px boxes relative to the root → integer image-pixel regions. Math.round is capture.txt's rounding,
// here and nowhere else (the child returns boxes unrounded). A box clamped to nothing is SKIPPED BY NAME.
export function regionsFromBoxes(boxes, scale, imgW, imgH) {
  if (!Array.isArray(boxes)) throw new Error("import-measure: boxes must be an array of {name, x, y, w, h}");
  const regions = [], skipped = [], seen = new Map();
  boxes.forEach((b, i) => {
    if (typeof b?.name !== "string" || !b.name) throw new Error(`import-measure: boxes[${i}].name is ${JSON.stringify(b?.name)} — a non-empty string expected`);
    for (const k of ["x", "y", "w", "h"]) {
      if (!Number.isFinite(b[k])) throw new Error(`import-measure: boxes[${i}].${k} is ${JSON.stringify(b[k])} — a finite number expected`);
    }
    const n = (seen.get(b.name) ?? 0) + 1;
    seen.set(b.name, n);
    const name = n === 1 ? b.name : `${b.name} #${n}`;
    let x = Math.round(b.x * scale), y = Math.round(b.y * scale), w = Math.round(b.w * scale), h = Math.round(b.h * scale);
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    w = Math.min(w, imgW - x);
    h = Math.min(h, imgH - y);
    if (w <= 0 || h <= 0) skipped.push(name);
    else regions.push({ name, x, y, w, h });
  });
  return { regions, skipped };
}

// The scale the reference was exported at, from the LAST ok export line of the import transcript.
// `rootW` is the first part's source width: a number is checked against the reference; fill/hug pass.
export function scaleOf(transcriptLines, rootW, ref) {
  const x = (Array.isArray(transcriptLines) ? transcriptLines : []).filter((l) => l?.type === "tool" && l.tool === "export" && l.ok === true).at(-1);
  if (!x) {
    return { refused: { kind: "no-reference", message: "This import's transcript has no export line: it was not read from Brilliant, so there is no original render to measure against.", action: IMPORT_AGAIN } };
  }
  const scale = x.input?.scale ?? LEGACY_SCALE;
  if (!SCALES.includes(scale)) {
    return { refused: { kind: "unknown-scale", message: `The reference was exported at scale ${JSON.stringify(scale)}, not one of ${SCALES.join(", ")}.`, action: IMPORT_AGAIN } };
  }
  if (Number.isFinite(rootW) && Math.abs(ref.w - rootW * scale) > 1) {
    return { refused: { kind: "unknown-scale", message: `The reference is ${ref.w} px wide; the source says ${rootW} × ${scale} = ${rootW * scale}.`, action: IMPORT_AGAIN } };
  }
  return { scale };
}

// The top-left w × h of a decoded image (decodePng's shape: RGB, 3 bytes a pixel). A candidate more than
// `scale` px larger on an axis is a renderer bug, not a crop, and so is one that is smaller.
export function cropTo(img, w, h, scale = 1) {
  if (img.w < w || img.h < h || img.w - w > scale || img.h - h > scale) {
    throw new Error(`import-measure: cannot crop a ${img.w}x${img.h} candidate to ${w}x${h} — it must be at least that size and no more than ${scale} px larger`);
  }
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) img.data.copy(data, y * w * 3, y * img.w * 3, y * img.w * 3 + w * 3);
  return { w, h, data };
}

// The record with its measurement, rebuilt through buildRecord: snaps, drops, unbound and the verdict are
// re-derived and checkRecord runs, so a measurement cannot smuggle a stale derived field.
export function withMeasurement(record, deltaEMin) {
  return buildRecord({
    id: record.id, source: record.source, ir: record.ir, recognition: record.recognition, mapping: record.mapping,
    fidelity: { wcag: record.fidelity.wcag, deltaEMin },
    provenance: record.provenance, elapsed: record.elapsed,
    ...(Object.hasOwn(record, "suggestions") ? { suggestions: record.suggestions } : {}),
  });
}

// One render, in a child process. Answers { png, boxes, engine, version } or { refused }.
export function spawnRender(job, { timeoutMs = RENDER_TIMEOUT_MS() } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO_DIR, "tooling/measure-render.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    // The child's own line when it wrote one; else Node's error line, not its trailing "Node.js vX" line.
    const lastErr = () => {
      const ls = err.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      return ls.findLast((l) => l.startsWith("measure-render:")) ?? ls.find((l) => /\bError\b/.test(l)) ?? ls.at(-1) ?? "no output on stderr";
    };
    const failed = () => ({ refused: { kind: "render-failed", message: "The renderer failed.", detail: lastErr(), action: MEASURE_AGAIN } });
    child.on("error", () => { clearTimeout(timer); resolve(failed()); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return resolve({ refused: { kind: "render-timeout", message: `The renderer did not answer within ${Math.round(timeoutMs / 1000)} s.`, action: MEASURE_AGAIN } });
      if (code === 3) return resolve({ refused: { kind: "no-renderer", message: lastErr(), action: { label: "Show the install command", hint: "cd tooling/visual-regression && npm ci" } } });
      if (code !== 0) return resolve(failed());
      try {
        const j = JSON.parse(out.trim());
        if (typeof j.png !== "string" || !Array.isArray(j.boxes)) return resolve(failed());
        resolve({ png: Buffer.from(j.png, "base64"), boxes: j.boxes, engine: j.engine, version: j.version });
      } catch { resolve(failed()); }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(job));
  });
}

const IMPORT_FILE_RE = /^i[1-9][0-9]*\.json$/;

export async function measureImport({ pkgRoot, name, render = spawnRender }) {
  return underLock(async () => {
    if (!isProposalName(name)) throw new Error(`import-measure: proposal name ${JSON.stringify(name)} is not a component name`);
    const buildRoot = path.join(pkgRoot, "build");
    const f = { mapping: underRoot(buildRoot, `proposals/${name}/mapping.json`), template: underRoot(buildRoot, `proposals/${name}/template.txt`) };
    const raw0 = { mapping: readFileSync(f.mapping, "utf8") };
    const id = JSON.parse(raw0.mapping).record;
    Object.assign(f, {
      record: underRoot(buildRoot, `imports/${id}.json`), md: underRoot(buildRoot, `imports/${id}.md`),
      reference: underRoot(buildRoot, `imports/${id}.reference.png`), candidate: underRoot(buildRoot, `imports/${id}.candidate.png`),
      transcript: underRoot(buildRoot, `imports/${id}.transcript.jsonl`),
    });
    raw0.record = readFileSync(f.record, "utf8");
    raw0.template = readFileSync(f.template, "utf8");
    const record = JSON.parse(raw0.record);
    const compositions = JSON.parse(raw0.template).compositions;

    if (!existsSync(f.reference)) {
      return { refused: { kind: "no-reference", message: "This import has no original render: a dropped file carries none, so there is nothing to measure against.", action: { label: "Import it from Brilliant to measure it", hint: "Select it in Brilliant, then Import selection" } } };
    }
    if (compositions?.[0] == null) {
      return { refused: { kind: "nothing-built", message: "The importer built nothing for the first part, so there is no candidate to render. The drop list says why.", action: { label: "Map the part in the editor below", hint: "Choose a builder in the Mapping list" } } };
    }

    const refBytes = readFileSync(f.reference);
    const ref = { w: refBytes.readUInt32BE(16), h: refBytes.readUInt32BE(20) };
    const lines = existsSync(f.transcript) ? readFileSync(f.transcript, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const root = record.ir.children[0];
    const sc = scaleOf(lines, root?.layout?.size?.w ?? root?.style?.size?.w, ref);
    if (sc.refused) return sc;
    const { scale } = sc;

    const t0 = Date.now();
    const out = await render({ composition: compositions[0], width: Math.ceil(ref.w / scale), height: Math.ceil(ref.h / scale), scale, backdrop: BACKDROP_HEX });
    if (out?.refused) return { refused: out.refused };
    const ms = Date.now() - t0;

    // Invariant 3: the files the render was taken from must still be the files on disk.
    if (readFileSync(f.mapping, "utf8") !== raw0.mapping || readFileSync(f.record, "utf8") !== raw0.record || readFileSync(f.template, "utf8") !== raw0.template) {
      return { refused: { kind: "stale", message: "The mapping changed while measuring.", action: MEASURE_AGAIN } };
    }

    const { regions, skipped } = regionsFromBoxes(out.boxes, scale, ref.w, ref.h);
    const A = decodePng(refBytes, "reference", { over: BACKDROP });
    const B = cropTo(decodePng(out.png, "candidate", { over: BACKDROP }), A.w, A.h, scale);
    // measure()'s shape (import/fidelity.mjs), built by hand because of the crop; the hashes are the RAW bytes.
    const m = measureImages(A, B, regions);
    const deltaEMin = {
      ...m,
      reference: { sha256: sha256(refBytes), source: `Brilliant export(png) of ${record.source.ids?.[0]} at scale ${scale}, flattened over ${BACKDROP_HEX}` },
      candidate: {
        sha256: sha256(out.png),
        source: `the importer's composition rendered by system/agentic-renderer.mjs under tokens.neutral.css in ${out.engine} ${out.version} at DSF ${scale} on ${BACKDROP_HEX}, cropped top-left to ${A.w}×${A.h} (tooling/measure-render.mjs)`,
        file: `imports/${id}.candidate.png`,
      },
    };
    const record2 = withMeasurement(record, deltaEMin);
    const importsDir = path.join(buildRoot, "imports");
    checkReferenceIndependence(readdirSync(importsDir).filter((x) => IMPORT_FILE_RE.test(x))
      .map((x) => (x === `${id}.json` ? record2 : JSON.parse(readFileSync(path.join(importsDir, x), "utf8")))));

    writeFileSync(f.candidate, out.png);
    appendFileSync(f.transcript, `${JSON.stringify({ type: "measure", ts: new Date().toISOString(), engine: out.engine, version: out.version, scale,
      reference: { w: ref.w, h: ref.h, sha256: deltaEMin.reference.sha256 }, candidate: { sha256: deltaEMin.candidate.sha256, bytes: out.png.length },
      boxes: out.boxes, skipped, worst: m.worst, scored: m.scored, verdict: record2.fidelity.verdict, ms })}\n`);
    writeFileSync(f.record, jsonText(sortKeys(record2)));
    writeFileSync(f.md, projectRecord(record2));
    return { measured: true, verdict: record2.fidelity.verdict, worst: m.worst, view: importView(pkgRoot, name) };
  }, "a measurement");
}
