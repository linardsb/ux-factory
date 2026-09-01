// portal/lib/version.mjs — which commit this PROCESS is running, and which one the tree is on
// (#338 F2). Node caches modules at import time, so a portal started days ago keeps serving the code
// it imported however far the working tree has moved; run 0's Phase A found exactly that — a drawer
// serving pre-review code for two days, discoverable only by reading `ps` start times against a git
// log. Nothing surfaced it, so this module makes it a field.
//
// TWO SHAS, and the difference IS the finding. BOOT_SHA is read ONCE, at import, so it is the commit
// this process actually loaded. headSha() re-reads on every call, so it is where the tree is NOW. A
// single per-request rev-parse would report the tree's HEAD and call a stale process fresh — the same
// lie, dressed as a version stamp.
//
// git is not a dependency of the portal, and a checkout outside a repo is a legitimate way to run it,
// so every failure answers null rather than throwing: a stamp that can take /api/health down is worse
// than no stamp.
import { execFileSync } from 'node:child_process';
import { REPO_DIR } from './env.mjs';

const sha = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
};

// Read at IMPORT, never again: this is the commit the running process was started from.
export const BOOT_SHA = sha();

export const headSha = sha;

// Unknown is not stale — two nulls must not raise a false alarm on a checkout with no git.
export const isStale = (boot, head) => Boolean(boot && head && boot !== head);
