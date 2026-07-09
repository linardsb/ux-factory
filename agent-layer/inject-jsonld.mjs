// JSON-LD injection. Spec: _factory/agent-layer.md §2.
// Person on every page; CreativeWork on each prototype + case-study page.
// Idempotent: the injected block is wrapped in markers and replaced on re-run.
// Absolute URLs are read from each page's existing <link rel="canonical">, so the
// structured data always matches the deployed domain.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseLedger, stripTags, clamp, first } from "./lib.mjs";

const OPEN = "<!-- agent-layer:jsonld -->";
const CLOSE = "<!-- /agent-layer:jsonld -->";

const canonicalOf = (html) => first(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
const titleOf = (html) => stripTags(first(html, /<title>([\s\S]*?)<\/title>/)).replace(/\s*·\s*Linards Bērziņš\s*$/, "");
const descOf = (html) => first(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/);

// Discover pages: root .html (minus 404), work/*.html, and every prototype dir
// (index.html with a `.proto-because` strip) plus any decisions.html beside it.
function discover(root) {
  const pages = [];
  const protoDirs = new Set();

  for (const f of readdirSync(root)) {
    if (f.endsWith(".html") && f !== "404.html") pages.push({ rel: f, cw: false });
  }
  if (existsSync(join(root, "work"))) {
    for (const f of readdirSync(join(root, "work"))) {
      if (f.endsWith(".html")) pages.push({ rel: `work/${f}`, cw: true });
    }
  }
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const index = join(root, d.name, "index.html");
    if (!existsSync(index) || !readFileSync(index, "utf8").includes("proto-because")) continue;
    protoDirs.add(d.name);
    pages.push({ rel: `${d.name}/index.html`, cw: true });
    if (existsSync(join(root, d.name, "decisions.html"))) pages.push({ rel: `${d.name}/decisions.html`, cw: true });
  }
  return { pages, protoDirs };
}

function personNode(meta, base) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${base}/#person`,
    name: meta.candidate,
    jobTitle: meta.person.jobTitle,
    url: `${base}/`,
    sameAs: meta.person.sameAs,
    address: { "@type": "PostalAddress", addressLocality: meta.person.addressLocality, addressCountry: "GB" },
  };
}

function creativeWorkNode(meta, base, page, html) {
  const isCase = page.rel.startsWith("work/");
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: titleOf(html),
    description: clamp(descOf(html), 160),
    url: canonicalOf(html) || `${base}/${page.rel.replace(/index\.html$/, "").replace(/\.html$/, "")}`,
    author: { "@id": `${base}/#person` },
    datePublished: meta.build_date,
    about: isCase ? "Product and UX design case study" : "Connected rail travel — an unsolicited Trainline concept",
  };
}

function injectInto(html, nodes) {
  const block = `${OPEN}\n  <script type="application/ld+json">\n${JSON.stringify(nodes, null, 2)}\n  </script>\n  ${CLOSE}\n`;
  const stripped = html.replace(new RegExp(`\\s*${OPEN}[\\s\\S]*?${CLOSE}\\n?`), "\n");
  return stripped.replace(/(\s*)<\/head>/, `\n  ${block}$1</head>`);
}

export function injectJsonLd({ meta }) {
  const root = resolve(meta.site_root);
  const base = canonicalOf(readFileSync(join(root, "index.html"), "utf8")).replace(/\/$/, "");
  if (!base) throw new Error("index.html has no canonical URL to derive the site base from");
  const person = personNode(meta, base);

  const { pages } = discover(root);
  for (const page of pages) {
    const path = join(root, page.rel);
    const html = readFileSync(path, "utf8");
    const nodes = page.cw ? [person, creativeWorkNode(meta, base, page, html)] : [person];
    writeFileSync(path, injectInto(html, nodes));
  }
  return { base, pages: pages.length, creativeWorks: pages.filter((p) => p.cw).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = injectJsonLd(parseLedger(process.argv[2] || "_factory/kb/decisions/trainline.md"));
  console.log(`json-ld         ✓  Person on ${r.pages} pages, +CreativeWork on ${r.creativeWorks} (base ${r.base})`);
}
