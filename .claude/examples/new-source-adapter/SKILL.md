---
name: new-source-adapter
description: Scaffold a new SourceAdapter for the AI Tutor's pluggable ingestion. Use when adding support for a new content source type (markdown, PDF, webpage, etc.).
argument-hint: [source-name]
---

# New Source Adapter

Scaffold a new content-source adapter for the AI Tutor's RAG ingestion pipeline.

The AI Tutor ingests content from many source types (YouTube transcripts, Dynamous markdown,
PDFs, webpages). Each source type is a **SourceAdapter** — a small, self-contained module that
knows how to discover items from that source, fetch their content, and produce a stable hash for
change detection. The ingestion orchestrator treats every adapter identically.

## Input

- `$ARGUMENTS` (`$1`) — the source name in lowercase (e.g. `pdf`, `webpage`, `notion`).
  Used for the module file name, the registry key, and the adapter class name.

Before scaffolding, read `source-adapter-guide.md` for the full contract,
shared types, and orchestrator details.

## Process

### 1. Read the contract

Read `source-adapter-guide.md` and an existing adapter under
`app/backend/ingest/` (e.g. the markdown or YouTube adapter) to mirror its exact patterns —
imports, type names, logging, and error handling.

### 2. Create the adapter module

**CREATE** `app/backend/ingest/<name>.py` implementing the `SourceAdapter` contract:

- `discover() -> list[SourceItem]` — enumerate every item available from this source
  (file paths, URLs, IDs). No content fetching here — just identifiers and metadata.
- `fetch(item: SourceItem) -> IngestPayload` — fetch one item and return an `IngestPayload`
  containing its `Segment`s (the chunked, embeddable units) plus source metadata.
- `content_hash(item: SourceItem) -> str` — return a stable hash of the item's raw content so
  the pipeline can skip unchanged items on re-ingestion.

Follow the existing adapters for:
- Type annotations on every function (mypy/pyright strict).
- Structured logging with `{domain}.{component}.{action}_{state}` event names.
- Raising the project's ingestion exception type on fetch/parse failures.

### 3. Create the test stub

**CREATE** `app/backend/ingest/tests/test_<name>.py` (mirror the existing adapter tests):

- A `discover()` test that asserts the expected `SourceItem`s are returned.
- A `fetch()` test that asserts a well-formed `IngestPayload` with non-empty `Segment`s.
- A `content_hash()` test that asserts the hash is stable for identical input and differs for
  changed input.

Use the project's fixture conventions; keep external I/O mocked or pointed at small test data.

### 4. Register the adapter

**UPDATE** the ingestion registry (the adapter registry / factory under `app/backend/ingest/`)
to map the source key `<name>` to the new adapter class so `ingest_payload()` can dispatch to it.

### 5. Validate

Run the project's validation (lint, type-check, the new tests) and confirm the adapter is
discoverable from the registry.

## Output

- `app/backend/ingest/<name>.py` — the new adapter implementing `discover` / `fetch` / `content_hash`
- `app/backend/ingest/tests/test_<name>.py` — test stub covering all three contract methods
- An updated registry entry mapping `<name>` to the adapter

Report the files created/modified and confirm validation passed.
