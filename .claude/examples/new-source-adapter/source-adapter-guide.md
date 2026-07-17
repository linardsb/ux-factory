# SourceAdapter Guide — AI Tutor Ingestion

On-demand context for adding a new content source to the AI Tutor's RAG ingestion pipeline.
This guide pairs with the `new-source-adapter` skill — the skill scaffolds the files, this
document explains the contract and the types they must conform to.

## Overview

The AI Tutor answers questions over a knowledge base built from many content sources — YouTube
transcripts, Dynamous community markdown, PDFs, webpages, and more. Rather than special-casing
each source, ingestion is **pluggable**: every source type is implemented as a `SourceAdapter`,
and a single orchestrator (`ingest_payload()`) drives them all identically.

Adding a new source type means writing one new adapter — no changes to the orchestrator, the
chunker, the embedder, or the vector store.

```
discover()  →  list[SourceItem]
                     │  (for each item)
                     ▼
content_hash(item)  →  skip if unchanged
                     │  (if new or changed)
                     ▼
fetch(item)  →  IngestPayload { SourceItem + list[Segment] }
                     │
                     ▼
ingest_payload(payload)  →  embed Segments, upsert into vector store
```

## The `SourceAdapter` Contract

Every adapter implements three methods. Keep them small, pure, and independently testable.

### `discover() -> list[SourceItem]`

Enumerate every item available from this source. This step does **no content fetching** — it
only produces identifiers and lightweight metadata so the pipeline knows what exists.

- For a file-based source: walk a directory, return one `SourceItem` per file.
- For a remote source: list URLs / API IDs, return one `SourceItem` per resource.
- Should be cheap and idempotent — it runs on every ingestion pass.

### `fetch(item: SourceItem) -> IngestPayload`

Fetch and parse one item's full content, then return an `IngestPayload`. This is where the
real work happens: download or read the raw content, parse it, split it into `Segment`s
(the chunked, embeddable units), and attach source metadata.

- Raise the project's ingestion exception type on download/parse failure.
- Produce `Segment`s sized for the embedding model (consistent with existing adapters).
- Do not embed here — embedding is the orchestrator's job.

### `content_hash(item: SourceItem) -> str`

Return a stable hash of the item's raw content. The pipeline compares this against the last
ingested hash to decide whether to re-`fetch()` the item or skip it.

- Same input content → same hash (deterministic).
- Any meaningful content change → different hash.
- Typically hash the raw bytes/text, not the parsed segments.

## Shared Types

These types are defined in the shared ingest types module and are used by every adapter.

### `SourceItem`

A lightweight descriptor of one item from a source — produced by `discover()`, consumed by
`fetch()` and `content_hash()`. Carries the identifier (path, URL, or external ID), the source
type key, and any metadata cheap to obtain during discovery (title, last-modified, etc.).

### `Segment`

One chunked, embeddable unit of content — a passage of text plus its metadata (position within
the item, section/heading, timestamps for transcripts, etc.). The RAG retriever returns
`Segment`s as the unit of context. `fetch()` produces a list of these.

### `IngestPayload`

The output of `fetch()` and the input to `ingest_payload()`. Bundles one `SourceItem` with the
list of `Segment`s extracted from it, plus the content hash and any source-level metadata. This
is the single hand-off object between an adapter and the orchestrator.

## The `ingest_payload()` Orchestrator

The shared orchestrator consumes an `IngestPayload` and performs the source-agnostic work:

1. Compares the payload's `content_hash` against the stored hash — skips unchanged items.
2. Embeds each `Segment` with the project's embedding model.
3. Upserts the embedded segments into the vector store (replacing prior segments for that item).
4. Records the new content hash and ingestion metadata.

Because this logic lives in one place, adapters never touch embedding or storage — they only
produce well-formed `IngestPayload`s.

## File Layout

```
app/backend/ingest/
├── __init__.py
├── types.py              # SourceItem, Segment, IngestPayload definitions
├── registry.py           # maps source-key → SourceAdapter class
├── orchestrator.py        # ingest_payload() — embed + upsert + hash tracking
├── markdown.py           # SourceAdapter for Dynamous markdown
├── youtube.py            # SourceAdapter for YouTube transcripts
├── <name>.py             # ← your new adapter
└── tests/
    ├── test_markdown.py
    ├── test_youtube.py
    └── test_<name>.py    # ← your new adapter's tests
```

(Exact module names may differ — check `app/backend/ingest/` for the current layout and mirror
the closest existing adapter.)

## Checklist for a New Adapter

- [ ] `discover()` / `fetch()` / `content_hash()` all implemented with full type annotations
- [ ] `fetch()` returns an `IngestPayload` with non-empty, correctly sized `Segment`s
- [ ] `content_hash()` is deterministic and change-sensitive
- [ ] Structured logging follows the `{domain}.{component}.{action}_{state}` convention
- [ ] Failures raise the project's ingestion exception type
- [ ] Test stub covers all three contract methods
- [ ] Adapter registered in the registry under its source key
- [ ] Lint, type-check, and the new tests all pass
