# Improvement Backlog

## Implemented Now

### Agent handoff output

Every compression run now writes `agent-handoff.md`.

Why: the most important use case is handing compressed context into a new chat, session, project, collaborator, or agent loop.

## Next Product Improvements

### Real importers

Add fixtures and parsers for:

- ChatGPT export JSON
- Claude copied/exported markdown
- Codex session transcripts

### Handoff scoring

Score whether a recipient or new agent can answer:

- What is the project trying to do?
- What changed?
- What was killed and why?
- What is the next action?

### Compression modes

Add explicit modes:

- `--mode agent`: paste-ready agent handoff
- `--mode collaborator`: human handoff
- `--mode self`: future-self memory

### Redaction

Before a `.loopthing` is shared, detect likely secrets, names, emails, API keys, and sensitive source snippets.

### Viewer simplification

The viewer should open with the handoff artifact and then let the reader inspect supporting evidence.

### Loop repair

Let a future agent read `agent-handoff.md`, run the project, append a new loop, and regenerate the handoff.

