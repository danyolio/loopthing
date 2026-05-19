# Product Roadmap

## V0: Compression Harness

Goal: prove that LoopThing can find the gold in messy AI conversations.

Commands:

```bash
loopthing compress ./transcripts --mode=handoff --out ./runs/run-001
loopthing score ./runs/run-001
loopthing compare ./runs/run-001/variants
loopthing seal ./runs/run-001
```

Outputs:

- `reasoning.md`
- `source-metadata.json`
- `compression-score.md`
- `variants/generic.md`
- `variants/structured.md`
- `variants/dual-render.md`

## V1: Shareable Artifact

Goal: make the useful compression portable and beautiful.

Build:

- `.loopthing` container sealing
- local viewer
- artifact inspector
- privacy/redaction pass
- export to markdown/PDF

## V2: Team Handoff Library

Goal: make recurring handoff useful for teams.

Build:

- team workspace
- artifact comments
- shared templates
- source permissions
- integration importers

## Not Yet

- hosted memory
- enterprise search
- multi-tenant workflow engine
- canonical marketplace
- heavy collaboration layer

## Product Gate

Do not advance to V1 until recipients beat generic summaries on comprehension and sendability.

