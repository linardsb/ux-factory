// tmp: mutation B v2 (#387) — a REMOTE taint path (node:http request → sink). process.argv is a
// LOCAL-threat-model source and GitHub's default query suite tracks remote sources only, which is
// why the argv seed produced no alert. Removed once the gate is proven.
import { createServer } from "node:http";
import { execFile } from "node:child_process";

export const server = createServer((req, res) => {
  const q = new URL(req.url, "http://localhost").searchParams.get("q");
  execFile("echo", [q ?? ""], () => {});   // argv element, never a shell string
  res.end(String(q));                      // echoed back, never evaluated
});
