# Loopthing MVP happy path and acceptance criteria

## Happy path

1. A person signs in with a passwordless email link.
2. They create a project from a blank or use-case template and land in its
   working document.
3. They write or paste unfinished material while Loopthing saves locally,
   synchronises collaborators, and records immutable checkpoints.
4. They add a source, unresolved question, decision, comment, or significant
   alternative branch beside the document.
5. They run a light Loop and see durable progress stages.
6. Loopthing returns structured insight: what changed, why it matters,
   unresolved issues, evidence links, a complete proposed revision, and one
   next action.
7. The canonical document remains unchanged until an Owner or Editor explicitly
   accepts the proposal.
8. Daily and weekly Loops use the same workflow and leave an auditable history.

## Measurable acceptance criteria

- Authentication: a valid magic link creates a secure cookie-backed session;
  production callbacks return to `loopthing.ai`; protected routes reject
  unauthenticated requests.
- Authorisation: every exposed project table has RLS; Owner, Editor, and Viewer
  capabilities match `docs/ARCHITECTURE.md`.
- Project setup: a new project atomically receives an owner membership and
  primary document, including the chosen template.
- Editing: the editor loads without a hydration mismatch, reconnects, and
  synchronises Yjs updates and awareness.
- Canonical history: every server save produces an immutable Yjs checkpoint
  with author, reason, sequence, and timestamp.
- Thinking objects: sources, private uploads, questions, decisions, comments,
  and branches can be created and revisited beside the document.
- Loops: manual, daily, and weekly modes share one Zod-validated structured
  output schema and store their progress and result.
- Human control: AI output remains a proposal until a person accepts it; a
  complete accepted proposal replaces the current document and creates a new
  checkpoint.
- Security: secrets remain server-only, uploads use a private bucket, cron
  validates its bearer secret, and advisors have no unresolved critical
  findings.
- Quality: typecheck, lint, tests with coverage, production build, npm audit,
  and the primary deployed flow pass.
- Operations: Web Analytics and Speed Insights are enabled, production logs are
  inspectable, and the custom domain serves the ready deployment.

## Launch limitations

- OpenAI/Codex synthesis is selectable but requires `OPENAI_API_KEY`; Gemini is
  the verified live provider.
- Realtime is verified on one Vercel instance. Shared Redis is required before
  treating cross-instance WebSocket fan-out as production-ready.
- Google OAuth is not enabled or shown; passwordless email is the live sign-in
  method.
- A strict Content Security Policy and repeatable model-quality evaluations are
  follow-up tasks.
