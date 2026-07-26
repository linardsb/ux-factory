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
//
// A reader's IMPORTED pack (#130) is a THIRD path, and it is checked FIRST, off a DIFFERENT
// store. It lives in sessionStorage because it is scoped to the visit (per tab, gone on tab
// close), and it must be read before the localStorage line below — which returns on a throw, so
// in private mode an imported pack would never be reached if it came second. When one is present
// this returns immediately: an imported pack SHADOWS the committed/derived pick rather than
// blending with it, which is also why nothing here writes to the `factory-pack` selector. A new
// tab has no session record and falls straight through to the paths below, so the guaranteed
// no-op default survives (VR-critical).
//
// LOAD-BEARING, and measured rather than reasoned (2026-07-26): this script's <script> tag is the
// LAST element in <head> on all eight pages that load it (build.html joined them, #135). The <style> appended below and a
// tokens.<pack>.css <link> are equal-specificity :root rules, so the later one in document order
// wins — and being parser-blocking, at the moment this runs only the elements ABOVE its own tag
// exist. A page that ever adds a stylesheet BELOW this tag would half-apply an imported pack on
// that page alone. Adding a stylesheet? Put it above this line. (The module path,
// pack-imported.mjs's applyImported, re-appends at call time and does not depend on this.)
(function () {
  var raw;
  try { raw = sessionStorage.getItem("factory-pack-imported"); } catch (e) { raw = null; }
  if (raw) {
    var irec = null;
    try { irec = JSON.parse(raw); } catch (e) { irec = null; }
    if (irec && irec.v === 1 && irec.source === "imported" && irec.tokens) {
      // Validated PER ENTRY, mirroring pack-imported.mjs's vetTokens in shape — a stored entry
      // that would not pass there is dropped here rather than reaching the DOM.
      var NAME = /^--(color|spacing|radius|type|shadow)-[a-z0-9-]{1,32}$/;
      var VAL = /^[a-zA-Z0-9 #%(),.\/+-]{1,160}$/;
      var out = [], ks = Object.keys(irec.tokens);
      for (var i = 0; i < ks.length; i++) {
        var k = ks[i], v = irec.tokens[k];
        if (NAME.test(k) && typeof v === "string" && VAL.test(v)) out.push("  " + k + ": " + v + ";");
      }
      if (out.length) {
        var st = document.createElement("style");
        st.id = "factory-pack-imported-style";
        st.setAttribute("data-ts", String(irec.ts));
        st.textContent = ":root {\n" + out.join("\n") + "\n}\n";
        document.head.appendChild(st);
        return; // an imported pack shadows the committed/derived pick; it is never blended with it
      }
    }
  }

  var pack;
  try { pack = localStorage.getItem("factory-pack"); } catch (e) { return; }
  // Committed pack (saulera/verdant/plusui): re-point the ONE stylesheet line. UNCHANGED path.
  if (pack === "saulera" || pack === "verdant" || pack === "plusui") {
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
