# First Product

LoopThing v0 should be a local CLI harness.

```text
loopthing compress ./transcripts --mode=handoff --out ./runs/run-001
loopthing score ./runs/run-001
loopthing compare ./runs/run-001/variants
loopthing seal ./runs/run-001
```

## Why CLI First

The first users are technical founders/builders. The CLI is not the final surface; it is the fastest way to test compression quality without building a platform.

## Deferred

- viewer polish
- hosted app
- browser extension
- format spec
- canonical library

Those become useful after the compression test works.
