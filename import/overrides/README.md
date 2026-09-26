# import/overrides/ — the owner's per-source snap fixes

The snap step (`import/snap-rules.mjs`, #307) matches every unbound value in an import to the nearest
contract token. An exact match fills silently; a near match is a **proposal**; a miss is a **drop**. When
the owner decides a proposal or a drop differently, that decision is written here and reused the next time
the **same** source file is imported.

## One file per source file

`<sha256>.json`, where `<sha256>` is the full lower-case hex sha256 of the source file's bytes
(`sourceHash(bytes)` in `import/snap-rules.mjs`):

```json
{
  "source": "<the same sha256>",
  "note": "optional — why these fixes",
  "snaps": [
    { "path": "ir.children[0]", "slot": "layout.gap", "ref": "--spacing-md" }
  ]
}
```

- `path` and `slot` name one snap row exactly as the import record lists it (`slot` is per side for padding:
  `layout.pad[2]`).
- `ref` must be a contract token in that slot's family (spacing, type, radius or colour). A ref from another
  family, or a row the snap step did not produce, is refused by name.
- The override changes exactly the rows it names and nothing else.

## The hash rule

Same bytes ⇒ same tree ⇒ same paths, which is why a row can be keyed by path. **A changed file has a new hash
and gets no overrides**: re-decide against the new rows rather than carry fixes onto a tree they were not
made for. A file whose inner `source` disagrees with its own name is refused.

## What never lives here

Gate fixtures. An override is the owner's decision, and a fixture written to exercise the mechanism is not
one; build-checks group 42's fixture lives in `import/fixtures/overrides/`. Nothing in this directory is
written by an agent — the mapping editor (#311) is where an owner makes these decisions.

## Where a real source's overrides go

This directory holds overrides for FICTIONAL packages only, because it is committed. For a package under
the jobs folder (`provenance: real`), `portal/lib/import-run.mjs` writes the same file format to
`<JOBS_DIR>/_import-overrides/` instead: a real designer's source hash is never committed. The directory is
chosen by the ROOT the package was opened from, never by its `run.json`'s declaration (#311).
