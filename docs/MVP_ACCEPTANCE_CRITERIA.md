# Loopthing MVP happy path and acceptance criteria

## Happy path

1. A person signs in with a passwordless email link.
2. They create a project from a blank or use-case template and land in its
   working document.
3. They drop unfinished material while Loopthing saves locally, synchronises
   collaborators, and records immutable checkpoints.
4. They add a source, unresolved question, decision, loose note, or significant
   alternative branch beside the document.
5. They run a light Loop and see durable progress stages.
6. Loopthing returns structured insight: what changed, why it matters,
   unresolved issues, evidence links, a complete proposed revision, and one
   next action.
7. The canonical document remains unchanged until an Owner or Editor explicitly
   accepts the proposal.
8. If there is new activity, the nightly Dream follows the new threads,
   critiques weak reasoning, and returns a complete rewrite.
9. The first Owner or Editor to open the project wakes the Dream into the
   document as a new immutable version. The previous version remains
   restorable.
10. Versions presents the Dream as a Before → After change set, with a document
    diff separating explicit human direction from Loopthing's own editorial
    development.
11. The main document highlights the latest Dream's changes in purple and
    later human additions in green, with controls to hide the highlighting or
    open the full version diff.
12. Weekly Loops use the same durable workflow for broader review.

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
- Human control: manual AI output remains a proposal until a person accepts it.
  Daily Dreams are explicitly authorised to become current after the prior
  document is preserved as a linked, restorable version.
- Dream rhythm: the workspace shows the exact next Dream, the cron only runs
  for projects with new activity, and the morning report names what became
  stronger, what remains weak, what changed, the open questions, and one next
  thread.
- Dream provenance: each applied Dream pairs the exact pre-Dream checkpoint with
  the rewritten checkpoint, exposes a Git-style line diff, and identifies
  changes directed by people, developed by Loopthing, or deliberately
  preserved.
- Dream review: changes from the latest Dream are purple and later human
  additions are green in the main document by default; people can hide or show
  them and open Versions for removed text and the complete diff.
- Invitations: an Owner can create or refresh up to 20 email-bound invitation
  links in one request without weakening the existing project-level RLS rules.
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
