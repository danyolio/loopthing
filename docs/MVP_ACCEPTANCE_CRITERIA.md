# Loopthing MVP happy path and acceptance criteria

## Happy path

1. A person signs in with a passwordless email link.
2. They create a project from a blank or use-case template and land in its
   working document.
3. They drop unfinished material while Loopthing saves locally, synchronises
   collaborators, and records immutable checkpoints.
4. They add a source, unresolved question, decision, loose note, or significant
   alternative branch beside the document.
5. They select exact document text, attach a comment, and see the passage
   marked in green. Clicking the marker or comment moves between the text and
   its thread.
6. They run a light Loop and see durable progress stages.
7. Loopthing returns passage, section, and document-level strengths, critiques,
   questions, conjectures, tensions, connections, and possibilities.
8. The canonical document remains unchanged until an Owner or Editor explicitly
   accepts the proposal.
9. If there is new activity, the nightly Dream follows the new threads,
   evaluates what is strong and weak, and leaves thoughtful interventions. A
   rewrite is optional.
10. People can reply to, dismiss, resolve, or incorporate the criticism. Those
   responses become human input for the next Dream.
11. When the Dream proposes a rewrite, the first Owner or Editor to open the
    project wakes it into the document as a new immutable version. The previous
    version remains restorable.
12. Versions presents any Dream rewrite as a Before → After change set, with a
    document diff separating explicit human direction from Loopthing's own
    editorial development.
13. The main document highlights the latest Dream's changes in purple and
    later human additions in green, with controls to hide the highlighting or
    open the full version diff.
14. Morning Review lets a person keep, revert, comment on, or branch each
    overnight change. Every action is recorded against the Dream version.
15. A reasoning ledger separates facts, evidence, claims, assumptions,
    hypotheses, preferences, questions, risks, proposals, experiments, and
    decisions.
16. A reasoning map renders the same ledger as a directed graph. Human input is
    green and Dream development is purple.
17. Decisions retain rationale, rejected alternatives, assumptions, a review
    date, and an explicit condition for reconsideration.
18. Weekly Loops use the same durable workflow for broader review.

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
- Human inline comments: every project member can select document text, attach
  a comment, reopen it from a green document marker, locate it from the
  Comments rail, and resolve their own comment. Owners can resolve any comment.
  Resolving removes the active decoration without deleting the durable input.
- Loops: manual, daily, and weekly modes share one Zod-validated structured
  output schema and store their progress and result.
- Critique: each Loop can return specific positive and negative judgment,
  questions, conjectures, tensions, connections, and possibilities at passage,
  section, or document scope. Anchored comments appear directly in the editor.
- Critique response: members can reply to, resolve, dismiss, or incorporate an
  intervention. The disposition survives reload and becomes context for the
  next Dream.
- Human control: manual AI output remains a proposal until a person accepts it.
  Daily Dreams are explicitly authorised to become current after the prior
  document is preserved as a linked, restorable version.
- Dream rhythm: the workspace shows the exact next Dream, the cron only runs
  for projects with new activity, and the morning report names what became
  stronger, what remains weak, what changed, the open questions, and one next
  thread.
- Dream provenance: each applied rewrite pairs the exact pre-Dream checkpoint
  with the rewritten checkpoint, exposes a Git-style line diff, and identifies
  changes directed by people, developed by Loopthing, or deliberately
  preserved.
- Dream review: changes from the latest Dream are purple and later human
  additions are green in the main document by default; people can hide or show
  them, review each change individually, and open Versions for removed text and
  the complete diff.
- Human deletions: passages removed or rewritten after the latest Dream appear
  as red strikethroughs beneath the working document, update as collaborators
  edit, remain absent from canonical content, and are treated as direction by
  the next Loop.
- Morning Review: each Dream block can be kept, reverted, turned into feedback
  for the next Dream, or preserved as a branch; the chosen disposition
  survives reload.
- Reasoning ledger: typed reasoning objects and their directed relationships
  are durable project context, protected by project RLS, and supplied to both
  manual and scheduled Loops.
- Decision memory: each decision can record rejected alternatives, assumptions,
  reconsideration conditions, and a review date. A Loop can flag genuinely
  conflicting new evidence and propose the smallest useful test.
- Reasoning map: the ledger and the latest immutable Dream reasoning snapshot
  render as an Argo-style DAG with clear source colour and labelled edges.
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
