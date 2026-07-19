# Loop Thing MVP happy path and acceptance criteria

## Happy path

1. A person signs in with a magic link or Google.
2. They create a project and land in its living document.
3. They write or paste working material while Loop Thing saves locally, synchronises collaborators, and records immutable checkpoints.
4. They add a source, unresolved question, decision, comment, or significant alternative branch beside the document.
5. They run a light Loop and see real progress stages rather than a spinner.
6. Loop Thing returns structured insight: what changed, why it matters, unresolved issues, evidence links, a proposed change, and one next action.
7. The canonical document remains unchanged until a permitted member explicitly accepts a proposal.
8. Daily and weekly Loops reuse the same durable workflow and leave an auditable history.

## Measurable acceptance criteria

- Authentication: a valid magic link creates a secure cookie-backed session and protected routes reject unauthenticated requests.
- Authorisation: every exposed project table has RLS; Owner, Editor, and Viewer capabilities match `docs/ARCHITECTURE.md`.
- Project setup: a new project atomically receives an owner membership and primary document.
- Editing: the editor loads without a hydration mismatch, works offline, reconnects, and synchronises Yjs updates and awareness.
- Canonical history: every server save produces an immutable Yjs checkpoint with author, reason, sequence, and timestamp.
- Thinking objects: sources, questions, decisions, comments, and branches can be created and revisited beside the document.
- Loops: manual, daily, and weekly modes share one Zod-validated structured output schema.
- Durability: Loop steps are retryable and idempotent; users can inspect queued, analysing, synthesising, saving, complete, and failed states.
- Human control: AI output is a proposal until a user explicitly accepts it.
- Security: secret keys remain server-only, uploads use a private bucket, and security/performance advisors have no unresolved critical findings.
- Quality: typecheck, lint, unit tests, production build, and the primary deployed flow pass.
- Operations: production logs are structured, Web Analytics and Speed Insights are enabled, and cron endpoints validate `CRON_SECRET`.
