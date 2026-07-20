// build-tokens.mjs — system/tokens.source.json (DTCG) → multi-target token outputs
// for the handoff pack: css / ios / android under handoff/verdant/tokens/ (epic #1,
// ticket #7, spike 4). Spec: docs/epics/ai-first-ux-factory.architecture.md §Stack.
// Run:  node tooling/style-dictionary/build-tokens.mjs   (or via agent-layer/gen-handoff.mjs)
//
// Spike 4 outcome (recorded on issue #7): SD 4.4.0 reads the string-profile source
// unmodified; all three targets ship. Mobile targets carry the transformable subset —
// colors, spacing, radius, layout — with a principled EXCLUSION LIST of web-only values
// that have no mobile equivalent (pruned by the strip-css-only preprocessor below):
//   - fontFamily stacks (arrays of web font names)
//   - clamp() type ramp (viewport-relative CSS expressions)
//   - color-mix() derived colors (CSS color expressions over custom properties)
//   - string shadows (CSS box-shadow shorthand, $type "shadow")
//   - motion durations/easings (CSS transition grammar, $type "duration"/"easing")

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "../../system/tokens.source.json");
const OUT = join(HERE, "../../handoff/verdant/tokens");

// css: default names are full-path (--contract-fg-surface-color-fg); leaf names
// restore the shipped naming (gen-token-css.mjs enforces leaf uniqueness per group).
StyleDictionary.registerTransform({
  name: "name/leaf",
  type: "name",
  transform: (t) => t.path.at(-1),
});

// ios/android: the default size transforms are rem-based ×16 (4px → 64.00dp).
// These pass px magnitudes through verbatim.
StyleDictionary.registerTransform({
  name: "size/px-to-cgfloat",
  type: "value",
  filter: (t) => (t.$type ?? t.type) === "dimension",
  transform: (t) => `CGFloat(${parseFloat(t.$value ?? t.value).toFixed(2)})`,
});
StyleDictionary.registerTransform({
  name: "size/px-to-dp",
  type: "value",
  filter: (t) => (t.$type ?? t.type) === "dimension",
  transform: (t) => `${parseFloat(t.$value ?? t.value).toFixed(2)}dp`,
});

// The exclusion list, mechanically. Platform-level preprocessors prune the tree
// BEFORE transforms run — a file-level filter is too late (transforms would already
// have thrown on clamp()/color-mix() values).
function stripCssOnly(node) {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || !child || typeof child !== "object") continue;
    if ("$value" in child) {
      const webOnly =
        child.$type === "fontFamily" ||
        child.$type === "shadow" ||
        child.$type === "duration" ||
        child.$type === "easing" ||
        (typeof child.$value === "string" && /\b(?:clamp|color-mix)\(/.test(child.$value));
      if (webOnly) delete node[key];
    } else {
      stripCssOnly(child);
    }
  }
  return node;
}
StyleDictionary.registerPreprocessor({
  name: "strip-css-only",
  preprocessor: (dictionary) => stripCssOnly(structuredClone(dictionary)),
});

const sd = new StyleDictionary({
  source: [SOURCE],
  platforms: {
    css: {
      transformGroup: "css",
      transforms: ["name/leaf"],
      buildPath: join(OUT, "css") + "/",
      files: [
        {
          destination: "contract.css",
          format: "css/variables",
          filter: (t) => t.path[0] === "contract",
          options: { outputReferences: true },
        },
        {
          destination: "neutral.css",
          format: "css/variables",
          filter: (t) => t.path[0] === "neutral",
          options: { outputReferences: true },
        },
      ],
    },
    ios: {
      transforms: ["attribute/cti", "name/camel", "color/UIColorSwift", "content/swift/literal", "asset/swift/literal", "size/px-to-cgfloat"],
      preprocessors: ["strip-css-only"],
      buildPath: join(OUT, "ios") + "/",
      files: [
        {
          destination: "FactoryTokens.swift",
          format: "ios-swift/class.swift",
          filter: (t) => t.path[0] === "neutral",
          options: { className: "FactoryTokens" },
        },
      ],
    },
    android: {
      transforms: ["attribute/cti", "name/snake", "color/hex8android", "size/px-to-dp"],
      preprocessors: ["strip-css-only"],
      buildPath: join(OUT, "android") + "/",
      files: [
        {
          destination: "tokens.xml",
          format: "android/resources",
          filter: (t) => t.path[0] === "neutral",
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
console.log("sd tokens       ✓  css + ios + android → handoff/verdant/tokens");
