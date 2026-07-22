// system/motion.mjs — count-up for measured numbers (hand-written canon; UX overhaul phase 3,
// plan: enchanted-snuggling-hejlsberg). A number "lands" by counting to its measured value.
// Honesty contract: the LAST frame writes the final string verbatim, so the displayed number is
// byte-identical to the measured artifact value. Reduced motion, no numeric part, or no rAF =
// instant final value. Duration comes from the --motion-count token (a pack retunes pace).

const NUM = /-?\d[\d,]*(?:\.\d+)?/;

export function countUp(el, finalString) {
  const s = String(finalString);
  const m = s.match(NUM);
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!m || reduce || typeof requestAnimationFrame !== "function") { el.textContent = s; return; }
  const target = parseFloat(m[0].replace(/,/g, ""));
  const decimals = (m[0].split(".")[1] || "").length;
  const grouped = m[0].includes(",");
  const prefix = s.slice(0, m.index);
  const suffix = s.slice(m.index + m[0].length);
  const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-count")) || 900;
  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    if (t >= 1) { el.textContent = s; return; } // final frame: the measured string, verbatim
    const eased = 1 - Math.pow(1 - t, 3);
    let n = (target * eased).toFixed(decimals);
    if (grouped) n = Number(n).toLocaleString("en-GB", { minimumFractionDigits: decimals });
    el.textContent = prefix + n + suffix;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Count when the element first scrolls into view (~30% visible), once. The element's current
// text is the final value; without IntersectionObserver or with reduced motion it just stays.
export function countUpOnVisible(el) {
  if (!("IntersectionObserver" in window)) return;
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const final = el.textContent;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { io.disconnect(); countUp(el, final); return; }
    }
  }, { threshold: 0.3 });
  io.observe(el);
}
