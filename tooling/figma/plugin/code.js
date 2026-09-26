// tooling/figma/plugin/code.js — hand-written canon (this repo; not generated). The HOUSE PLUGIN's main
// script: dumps the current Figma selection as JSON for import/figma.mjs (epic #295 ticket #310;
// docs/epics/canvas-design-import.architecture.md:315-320 (S5); .claude/plans/figma-plugin-s5-converter-310.md;
// install and run: docs/figma-runbook.md § C). A development plugin, loaded from disk in Figma desktop.
//
// A PLAIN SCRIPT. Figma's `main` is one file with no module loader, so there is no import, no export and
// no require (architecture :94-95, "no bundler"). The syntax stays at ES2017 (no `?.`, no `??`, no object
// spread) so the plugin sandbox's parser is not a reason for the one owner run to fail.
//
// 1. IT READS AND NEVER MAPS. The export command dumps a fixed allow-list of node properties and every
//    variable the selection references, and decides nothing: auto-layout is not turned into a stack here,
//    and a variable is not turned into a contract token here. Every rule lives in import/figma.mjs, where
//    build-checks group 40 drives it in milliseconds; a rule in this file would sit inside Figma's sandbox,
//    where no CI case reaches it and every change costs another owner run.
// 2. THE ALLOW-LIST IS THE SCOPE. PROPS is what is read. Anything not listed is NOT read — notably
//    rotation, constraints, blend mode, min/max size and layout grids — and S5's verdict is scoped to it.
// 3. figma.mixed IS WRITTEN "mixed", at the top level of a prop. JSON.stringify silently OMITS a
//    symbol-valued key, so without plain() a mixed fontSize would vanish from the file, which is a miss
//    nobody recorded (import/ir.mjs, "A MISS IS RECORDED"). A getter that throws is recorded as
//    {unreadable: <message>} for the same reason, never skipped — getMainComponentAsync() included.
// 4. NO CLOCK. The export carries no timestamp, so two honest runs over the same file are byte-identical.
// 5. THE BUILDER WRITES; THE EXPORT NEVER DOES. "Build S5 fixture" is test scaffolding: it creates the
//    variables, the component set and the bindings of the plan's Task A5 recipe in the open file. The
//    export path reaches no create*, setBoundVariable or combineAsVariants call — group 40 (40.21) runs
//    this file against a fake `figma` that has none of them.

var FORMAT = "ux-factory/figma-export";   // import/figma.mjs checks this string; case 40.21 ties the two
var VERSION = 1;

var PROPS = ["id", "name", "type", "visible", "x", "y", "width", "height", "opacity",
  "layoutMode", "layoutWrap", "itemSpacing", "counterAxisSpacing",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "primaryAxisAlignItems", "counterAxisAlignItems", "layoutSizingHorizontal", "layoutSizingVertical",
  "fills", "strokes", "strokeWeight", "dashPattern", "cornerRadius", "effects",
  "characters", "fontSize", "fontName", "fontWeight", "lineHeight", "textAlignHorizontal",
  "boundVariables", "componentProperties"];

function plain(v) { return v === figma.mixed ? "mixed" : v; }

// Every {type: "VARIABLE_ALIAS", id} anywhere under `o`, into the Set.
function collect(o, aliases) {
  if (!o || typeof o !== "object") return;
  if (o.type === "VARIABLE_ALIAS" && typeof o.id === "string") { aliases.add(o.id); return; }
  for (var k in o) collect(o[k], aliases);
}

async function dump(node, aliases) {
  var out = {};
  for (var i = 0; i < PROPS.length; i++) {
    var p = PROPS[i];
    if (!(p in node)) continue;
    try { out[p] = plain(node[p]); } catch (e) { out[p] = { unreadable: String(e && e.message) }; }
  }
  collect(out.boundVariables, aliases);
  var paints = [].concat(Array.isArray(out.fills) ? out.fills : [], Array.isArray(out.strokes) ? out.strokes : []);
  for (var j = 0; j < paints.length; j++) collect(paints[j].boundVariables, aliases);
  if (node.type === "INSTANCE") {
    // Caught like a PROPS read: a deleted or unlinked main component marks this field, not the whole export.
    try {
      var main = await node.getMainComponentAsync();
      out.main = main
        ? { name: main.name, setName: main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : null }
        : null;
    } catch (e) { out.main = { unreadable: String(e && e.message) }; }
  }
  if ("children" in node) {
    out.children = [];
    for (var c = 0; c < node.children.length; c++) out.children.push(await dump(node.children[c], aliases));
  }
  return out;
}

// id → {name, collection, resolvedType}, or {unresolved: true} for a variable the file cannot reach
// (a library variable that is not imported). Ids are sorted so the key order is the same every run.
async function resolve(aliases) {
  var variables = {};
  var ids = Array.from(aliases).sort();
  for (var i = 0; i < ids.length; i++) {
    var v = await figma.variables.getVariableByIdAsync(ids[i]);
    if (!v) { variables[ids[i]] = { unresolved: true }; continue; }
    var col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    variables[ids[i]] = { name: v.name, collection: col ? col.name : null, resolvedType: v.resolvedType };
  }
  return variables;
}

async function exportSelection() {
  var picked = figma.currentPage.selection;
  if (!picked.length) { figma.notify("Select a component first"); figma.closePlugin(); return; }
  var aliases = new Set();
  var selection = [];
  for (var i = 0; i < picked.length; i++) selection.push(await dump(picked[i], aliases));
  var variables = await resolve(aliases);
  var json = JSON.stringify({
    format: FORMAT, version: VERSION,
    source: { plugin: "tooling/figma/plugin", file: figma.root.name, page: figma.currentPage.name },
    variables: variables, selection: selection,
  }, null, 2);
  figma.showUI(__html__, { width: 480, height: 360 });
  figma.ui.postMessage({ type: "export", json: json, name: picked[0].name });
}

// ---- Build S5 fixture: the plan's Task A5 recipe as API calls (same names, values, bindings) --------

var FLOATS = [["spacing/xs", 4], ["spacing/sm", 8], ["spacing/md", 16], ["radius/full", 9999],
  ["font/size/md", 16], ["font/size/sm", 14], ["font/size/xs", 12]];
var COLORS = [["color/primary/container", "#F2F5FA"], ["color/text/primary", "#454545"],
  ["color/text/secondary", "#575757"], ["color/success/container", "#F1F7F2"], ["color/success", "#00C950"],
  ["color/text/disabled", "#C6C6C6"]];

function rgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

async function buildFixture() {
  var step = "start";
  // A binding that fails is LISTED in the closing message rather than aborting the build: the census
  // and the decision table already read a family with no alias, so one refused binding costs a README
  // line instead of the 30–45 minute hand recipe.
  var unbound = [];
  try {
    step = "refuse a second build";
    var existing = await figma.variables.getLocalVariableCollectionsAsync();
    if (existing.some(function (c) { return c.name === "ux-factory"; })) {
      figma.closePlugin("A ux-factory collection already exists — build into a new file");
      return;
    }

    step = "variables";
    var col = figma.variables.createVariableCollection("ux-factory");
    var mode = col.modes[0].modeId;
    var V = {};
    FLOATS.forEach(function (f) { var v = figma.variables.createVariable(f[0], col, "FLOAT"); v.setValueForMode(mode, f[1]); V[f[0]] = v; });
    COLORS.forEach(function (c) { var v = figma.variables.createVariable(c[0], col, "COLOR"); v.setValueForMode(mode, rgb(c[1])); V[c[0]] = v; });

    step = "fonts";
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });

    var bind = function (node, field, name) {
      try { node.setBoundVariable(field, V[name]); } catch (e) { unbound.push(node.name + "." + field + " (" + e.message + ")"); }
    };
    var fill = function (node, name) {
      var paint = { type: "SOLID", color: rgb(COLORS.filter(function (c) { return c[0] === name; })[0][1]) };
      try { paint = figma.variables.setBoundVariableForPaint(paint, "color", V[name]); } catch (e) { unbound.push(node.name + ".fills (" + e.message + ")"); }
      node.fills = [paint];
    };
    var pad = function (node, tb, lr) {
      bind(node, "paddingTop", tb); bind(node, "paddingBottom", tb);
      bind(node, "paddingLeft", lr); bind(node, "paddingRight", lr);
    };
    var text = function (name, chars, style, size, colour) {
      var t = figma.createText();
      t.name = name;
      t.fontName = { family: "Inter", style: style };
      t.characters = chars;
      bind(t, "fontSize", size);
      fill(t, colour);
      return t;
    };

    step = "root";
    var root = figma.createComponent();
    root.name = "state=active";
    root.layoutMode = "HORIZONTAL";
    root.fills = [];   // the recipe draws no fill on the root (spike C's instance line carries none)
    root.resize(360, 100);
    bind(root, "itemSpacing", "spacing/md");
    pad(root, "spacing/md", "spacing/md");
    root.layoutSizingHorizontal = "FIXED";
    root.layoutSizingVertical = "HUG";

    step = "Avatar";
    var avatar = figma.createEllipse();
    avatar.name = "Avatar";
    avatar.resize(32, 32);
    fill(avatar, "color/primary/container");
    root.appendChild(avatar);

    step = "Text block";
    var block = figma.createFrame();
    block.name = "Text block";
    block.layoutMode = "VERTICAL";
    block.fills = [];   // spike C's f[]
    bind(block, "itemSpacing", "spacing/xs");
    block.paddingTop = 0; block.paddingRight = 0; block.paddingBottom = 0; block.paddingLeft = 0;
    root.appendChild(block);
    block.layoutSizingHorizontal = "FILL";
    block.layoutSizingVertical = "HUG";
    block.appendChild(text("Text 1", "Amara Okafor", "Semi Bold", "font/size/md", "color/text/primary"));
    var t2 = text("Text 2", "Last seen 2 min ago", "Regular", "font/size/sm", "color/text/secondary");
    t2.lineHeight = { unit: "PERCENT", value: 150 };   // left UNBOUND by the recipe
    block.appendChild(t2);

    step = "Status chip";
    var chip = figma.createFrame();
    chip.name = "Status chip";
    chip.layoutMode = "HORIZONTAL";
    chip.primaryAxisAlignItems = "CENTER";
    chip.counterAxisAlignItems = "CENTER";
    chip.itemSpacing = 0;
    pad(chip, "spacing/xs", "spacing/sm");
    ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].forEach(function (r) { bind(chip, r, "radius/full"); });
    fill(chip, "color/success/container");
    root.appendChild(chip);
    chip.layoutSizingHorizontal = "HUG";
    chip.layoutSizingVertical = "HUG";
    chip.appendChild(text("Text 3", "On call", "Medium", "font/size/xs", "color/success"));

    step = "caret-right";
    var chevron = figma.createVector();
    chevron.name = "caret-right";
    chevron.vectorPaths = [{ windingRule: "NONZERO", data: "M 0 0 L 8.73 8 L 0 16 Z" }];
    chevron.strokes = [];
    fill(chevron, "color/text/disabled");
    root.appendChild(chevron);

    step = "variants";
    var away = root.clone();
    away.name = "state=away";
    var set = figma.combineAsVariants([root, away], figma.currentPage);
    set.name = "Spike List Row";

    step = "instance";
    var inst = root.createInstance();
    inst.x = set.x + set.width + 80;
    inst.y = set.y;
    figma.currentPage.selection = [inst];
    figma.viewport.scrollAndZoomIntoView([inst]);
    figma.closePlugin("S5 fixture built — run Export selection" + (unbound.length ? " · NOT BOUND: " + unbound.join("; ") : ""));
  } catch (e) {
    figma.closePlugin("Build failed at " + step + ": " + (e && e.message));
  }
}

function run() {
  if (figma.command === "export") return exportSelection();
  if (figma.command === "build-fixture") return buildFixture();
  figma.closePlugin("unknown command");
  return Promise.resolve();
}

run().catch(function (e) { figma.closePlugin("Export failed: " + (e && e.message)); });
