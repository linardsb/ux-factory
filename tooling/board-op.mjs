// tooling/board-op.mjs — the fenced build agent's ONLY build tool (epic #202, ticket #203;
// architecture §Recorder contract). One invocation applies exactly ONE op to a board-state file
// and prints the whole resulting board back, ids included — so one Bash call is one op is one
// trace step, and the agent learns the machine-assigned ids for its next op from real output
// rather than inventing them.
//
//   node tooling/board-op.mjs <board.json> '<op json>'   apply one op, print the new board
//   node tooling/board-op.mjs <board.json> --validate     assertBoard, print the counts
//
// The board path is resolved against process.cwd() and stays repo-relative in what the agent
// TYPES, because that string is recorded verbatim in the committed trace. The recorder sets cwd:
// the repo root on a real run, a scratch dir on --dry.
//
// This file writes wherever it is pointed. It is operator/agent tooling, not a server route — the
// RECORDER'S FENCE, not this file, is what constrains the target. A second path allowlist here
// would be a second copy of the fence, and it would drift from it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { applyOp, assertBoard, emptyBoard, parseOpCommand } from "../system/board-ops.mjs";

const readBoard = (file) => {
  if (!existsSync(file)) return emptyBoard();
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { throw new Error(`${file}: not JSON — ${e.message}`); }
};

const writeBoard = (file, board) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(board, null, 2) + "\n");
};

// The argv the agent typed, re-joined and read through the SAME grammar the recorder's fence
// denies with (system/board-ops.mjs:parseOpCommand). Running the real parser here — rather than
// trusting argv positionally — means a command this CLI accepts is a command the projection can
// read, and there is no third opinion about what an op call looks like.
export function runBoardOp(argv, cwd = process.cwd()) {
  const [boardArg, opArg] = argv;
  if (!boardArg || !opArg) throw new Error("usage: node tooling/board-op.mjs <board.json> '<op json>' | --validate");
  const parsed = parseOpCommand(`node tooling/board-op.mjs ${boardArg} ${opArg === "--validate" ? "--validate" : `'${opArg}'`}`);
  const file = resolve(cwd, boardArg);

  if (parsed.kind === "validate") {
    const counts = assertBoard(readBoard(file)); // throws, naming what is malformed
    return { validated: true, counts };
  }
  const board = applyOp(readBoard(file), parsed.op); // pure; throws naming the op
  writeBoard(file, board);
  return { validated: false, board };
}

// Errors exit 1 with a legible message on stderr: the agent reads it and corrects itself inside
// the implement phase. A silent success on a bad op would put a wrong op in the committed trace.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const r = runBoardOp(process.argv.slice(2));
    if (r.validated) console.log(`board ✓ ${r.counts.places} places · ${r.counts.affordances} affordances · ${r.counts.connections} connections`);
    else console.log(JSON.stringify(r.board, null, 2));
  } catch (e) {
    console.error(`board-op ✗  ${e.message}`);
    process.exit(1);
  }
}
