// system/pack-boot.js — pre-paint pack restore (portfolio-ux-uplift §Phase 5).
// Classic parser-blocking script ON PURPOSE: it must swap the pack link before first
// paint (a deferred module would flash neutral). Reads the pack the reader chose in the
// appearance dock (system/dock.mjs persists it) and re-points the ONE stylesheet line
// the whole re-skin rides on. Hard allowlist — storage content never reaches an href
// uninspected. Default markup keeps tokens.neutral.css: with empty storage this script
// is a guaranteed no-op, which the visual-regression harness relies on (its pack swap
// keys on the literal neutral URL, visual.spec.mjs:58, and VR contexts have no storage).
(function () {
  var pack;
  try { pack = localStorage.getItem("factory-pack"); } catch (e) { return; }
  if (pack !== "saulera" && pack !== "verdant") return;
  var link = document.querySelector('link[href="/system/tokens.neutral.css"]');
  if (link) link.href = "/system/tokens." + pack + ".css";
})();
