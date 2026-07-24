// system/pack-boot.js — pre-paint pack restore (portfolio-ux-uplift §Phase 5).
// Classic parser-blocking script ON PURPOSE: it must swap the pack link before first
// paint (a deferred module would flash neutral). Reads the pack the reader chose in the
// appearance dock (system/dock.mjs persists it) and re-points the ONE stylesheet line
// the whole re-skin rides on. Hard allowlist — storage content never reaches an href
// uninspected. Default markup keeps tokens.neutral.css: with empty storage this script
// is a guaranteed no-op, which the visual-regression harness relies on (its pack swap
// keys on the literal neutral URL, visual.spec.mjs:58, and VR contexts have no storage).
//
// A visitor's DERIVED "your brand" pack (#74, D5b) is NOT a committed stylesheet — it is a
// set of --color-* custom properties (system/pack-derived.mjs serialises it to factory-pack-derived).
// When the selector is "derived", re-apply that set to :root pre-paint under a hard allowlist
// (key + hex value) so storage content never reaches the DOM uninspected. Absent / neutral /
// unknown still returns before touching anything — the no-op default is preserved (VR-critical).
(function () {
  var pack;
  try { pack = localStorage.getItem("factory-pack"); } catch (e) { return; }
  // Committed pack (saulera/verdant): re-point the ONE stylesheet line. UNCHANGED path.
  if (pack === "saulera" || pack === "verdant") {
    var link = document.querySelector('link[href="/system/tokens.neutral.css"]');
    if (link) link.href = "/system/tokens." + pack + ".css";
    return;
  }
  // Derived pack: inline --color-* props on :root. Anything else is the guaranteed no-op.
  if (pack !== "derived") return;
  var raw;
  try { raw = localStorage.getItem("factory-pack-derived"); } catch (e) { return; }
  if (!raw) return;
  var rec;
  try { rec = JSON.parse(raw); } catch (e) { return; }
  if (!rec || rec.v !== 1 || rec.source !== "derived" || !rec.tokens) return;
  var KEY = /^--color-[a-z0-9-]+$/, HEX = /^#[0-9a-fA-F]{3,8}$/;
  var s = document.documentElement.style, keys = Object.keys(rec.tokens);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], v = rec.tokens[k];
    if (KEY.test(k) && typeof v === "string" && HEX.test(v)) s.setProperty(k, v);
  }
})();
