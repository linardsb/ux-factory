// tmp: mutation B (#387) — a real taint path from a recognised source (process.argv) into a code
// sink, so CodeQL's js/code-injection fires. Removed once the gate is proven.
import { argv } from "node:process";

export function seeded() {
  return eval(argv[2]);
}
