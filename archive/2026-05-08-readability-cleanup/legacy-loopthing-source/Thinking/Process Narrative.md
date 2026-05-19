# Process Narrative

LoopThing began as a broad idea: AI work needed a shareable artifact for the reasoning behind the final output.

The early versions explored origin traces, repo explainers, rich containers, visual viewers, and company operating loops. Those branches produced useful artifacts, but they also made the project noisy.

The pressure test narrowed the product.

The surviving wedge is **compression-first handoff**:

```text
messy AI work -> compressed reasoning -> agent handoff
```

The important output is not every document in the folder. The important output is the smallest artifact that lets someone or some agent continue from the real state of the work.

The current run produces:

- `reasoning.md`
- `agent-handoff.md`
- `source-metadata.json`
- `compression-score.md`
- `yourproject.loopthing`

The viewer exists to make that handoff inspectable. It should not hide weak compression behind polish.
