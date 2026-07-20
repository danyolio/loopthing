# Loopthing project specification and build checklist

Only completed and verified work is checked. This file was last verified against
production on 20 July 2026.

## Product specification

- Loopthing is a continuous-thinking workspace for work that develops over
  days, weeks, or months.
- A person or team can add loose conjecture, notes, sources, questions,
  decisions, comments, and alternatives before the work is polished.
- People add raw notes, sources, questions, voice transcripts, and loose
  conjecture without waiting for a polished brief.
- Each overnight Dream follows the new material, challenges the reasoning, and
  rewrites the document into a stronger next state.
- The document is the primary working surface.
- Manual Loop output remains a proposal until a person accepts it. A scheduled
  daily Dream is authorised to become current after the prior version is
  preserved.
- Significant alternatives appear as branches instead of silent rewrites.
- Initial use cases are strategy, research, investment, planning, design
  reviews, long-form writing such as essays and blog posts, and hiring
  decisions.

## Technical specification

- Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui provide the
  web application and component system.
- Supabase provides passwordless authentication, PostgreSQL, project
  memberships, invitations, Row Level Security, and private file storage.
- Tiptap is the editor. Yjs and Hocuspocus provide collaboration, awareness,
  reconnection, and IndexedDB recovery.
- Immutable Yjs checkpoints preserve canonical history; derived plain text
  provides Loop context, previews, and diffs.
- Gemini is the live synthesis provider through the Vercel AI SDK. OpenAI is
  implemented as an optional provider and requires a server-side API key.
- Zod validates every structured Loop result.
- Vercel hosts Next.js, the WebSocket endpoint, cron, and retryable Workflow
  DevKit jobs. Supabase remains the durable system of record.

## Decisions

- [x] Use Vercel Workflow DevKit as the durable job runner.
- [x] Deploy Next.js, Workflow jobs, cron, and the Hocuspocus WebSocket endpoint
  on Vercel; use Supabase as durable state.
- [x] Store sources, transcripts, and attachments in private Supabase Storage.
- [x] Define Owner, Editor, and Viewer capabilities.
- [x] Launch with passwordless email sign-in; do not show disabled Google OAuth.

## Product and interface

- [x] Commit the supplied core system prompt.
- [x] Commit and maintain this project checklist.
- [x] Define the MVP happy path and measurable acceptance criteria.
- [x] Build the Tiptap document workspace.
- [x] Build sources, private uploads, questions, decisions, comments, branches,
  checkpoints, restoration, and history.
- [x] Build structured insights, proposal review, progress, and one next action.
- [x] Rewrite the landing page with the “Great work is developed” direction.
- [x] List the initial use cases, including essays and blog posts under
  long-form writing.
- [x] Use “Start a project” as the primary call to action.
- [x] Support solo and asynchronous team projects.
- [x] Explain the daytime capture, overnight Dream, and morning review rhythm
  on the landing page.
- [x] Show a localised countdown to the next daily Dream in each project.
- [x] Let a new project start blank so its first Dream can develop raw input.

## Authentication, data, and permissions

- [x] Configure Supabase passwordless email authentication and production
  redirects for `loopthing.ai`.
- [x] Create project memberships and invitations.
- [x] Let an Owner create or refresh several email-bound invitations at once.
- [x] Enforce Owner, Editor, and Viewer policies with RLS on every exposed
  project table.
- [x] Verify that a Viewer cannot edit thinking objects but can comment.
- [x] Configure the private `loopthing-attachments` bucket and verify a real
  upload.
- [x] Keep AI and cron secrets on the server.
- [ ] Enable Google OAuth before restoring a Google sign-in button.
- [ ] Enable Supabase leaked-password protection if password authentication is
  introduced.

## Realtime and history

- [x] Build Yjs, Hocuspocus, awareness, reconnection, and IndexedDB recovery.
- [x] Wire upgraded Vercel WebSocket messages and closes into Hocuspocus.
- [x] Verify production WebSocket authentication, synchronisation, checkpoint
  persistence, reload, manual save, autosave, and restore.
- [x] Keep accepted AI revisions and accepted branches as new immutable
  checkpoints.
- [x] Replace checkpoint noise in the project context with named,
  human-readable document versions.
- [x] Preserve each Dream rewrite as a version linked to its Loop and insight.
- [x] Present every Dream as a restorable Before → After change set with a
  line-by-line diff and explicit change attribution.
- [x] Highlight the latest Dream's changes in purple and later human additions
  in green directly in the main document, with controls to hide them or open
  the full version diff.
- [x] Show passages deleted or rewritten after the latest Dream as redlines
  beneath the canonical document and treat their removal as human direction.
- [x] Add a persistent Morning Review for keeping, reverting, commenting on, or
  branching each Dream change.
- [x] Add a durable typed reasoning ledger and an Argo-style DAG using green
  for human contributions and purple for Dream development.
- [x] Add decision memory for rationale, rejected alternatives, assumptions,
  review dates, reconsideration conditions, evidence alerts, and the smallest
  useful test.
- [ ] Add shared Redis before relying on realtime collaboration across multiple
  simultaneous Vercel instances.

## AI and durable Loops

- [x] Add `GOOGLE_GENERATIVE_AI_API_KEY` to local and production server secrets
  without committing its value.
- [x] Build Gemini and OpenAI/Codex provider selection against one structured
  output schema.
- [x] Verify a real Gemini Loop in production.
- [x] Ensure an accepted full-document proposal replaces rather than appends to
  the canonical document.
- [x] Build and verify light, daily, and weekly Loops with durable progress,
  idempotency, and stored insights.
- [x] Verify Vercel cron authentication and the daily/weekly schedule advance.
- [x] Schedule daily Dreams inside the Melbourne overnight window.
- [x] Skip daily Dreams when nothing new was contributed.
- [x] Produce an overnight Dream report with strengths, critique, changes,
  questions, and one thread to follow.
- [x] Persist per-change rationale and source provenance, a compact reasoning
  graph, and decision-reconsideration alerts with every Loop.
- [x] Apply a complete Dream rewrite atomically while preserving the prior Yjs
  state.
- [ ] Add `OPENAI_API_KEY` to local and production server secrets.
- [ ] Run and verify a real OpenAI/Codex synthesis after that key is added.
- [ ] Add repeatable model-quality evaluations beyond schema validation and
  product contract tests.

## Deployment and operations

- [x] Deploy the production application to Vercel.
- [x] Attach and verify `loopthing.ai` and `www.loopthing.ai`.
- [x] Configure Web Analytics, Speed Insights, structured logs, rate limits,
  cron authentication, and baseline browser security headers.
- [x] Run typecheck, lint, unit tests with coverage, a production build, and npm
  audit.
- [x] Run the authenticated production flow end to end.
- [x] Check Supabase security and performance advisors after the final
  migration.
- [ ] Add a strict nonce-based Content Security Policy after auditing the
  editor, analytics, Supabase, Workflow, and WebSocket sources it must allow.

## Verification record

- Passwordless sign-in: passed.
- Protected routing and callback redirect: passed.
- Project workspace and long-form-writing template: passed.
- Realtime WebSocket and persisted checkpoints: passed on one Vercel instance.
- Thinking objects, upload, branch acceptance, history, and restoration: passed.
- Owner/Viewer RLS role checks: passed.
- Gemini light, daily, and weekly Loops: passed.
- Overnight Dream: passed end to end in production from a loose conjecture,
  through the authenticated cron and Gemini workflow, to a complete document
  rewrite, morning report, automatic application, and linked restorable
  version.
- Dream provenance and idempotency: passed; legacy daily Loops remain ordinary
  insights and Dreams use their own `dream:` run identity.
- Production cron secret: verified against the database hash and corrected in
  Vercel; an authenticated production invocation started the controlled Dream.
- OpenAI/Codex real provider call: pending API key.
- Supabase advisor: no critical findings; one password-protection warning that
  is not used by the current passwordless-only flow.
- Overnight Dream migrations: applied; after the controlled run, the next
  production Dream is scheduled for 03:00 Melbourne time on 21 July and
  new-activity gating is active.
- Dream change sets: passed in production on a real project. The exact
  pre-Dream and post-Dream checkpoints are paired and independently restorable;
  the review shows a line diff, explicit human direction, Loopthing's
  independent changes, and the proposed next step.
- Batch invitations: passed. The production interface accepts up to 20
  addresses, the API and Owner-only database function create separate
  email-bound links atomically, and a two-address database verification was
  rolled back without leaving test invitations.
- Main-document Dream highlighting: passed in production on a real 47-section
  Dream. Dream-written sections render in purple, later human additions and
  rewrites render in green, and saved feedback is green in the context rail.
  Hide/show removes and restores the decorations without changing canonical
  content.
- Human deletion redlines: full deletions and rewrites are derived from the
  latest Dream version, rendered below rather than reinserted into the
  canonical document, and supplied to the next Loop as intentional direction.
- Morning Review, reasoning ledger, DAG, and decision memory: passed release
  verification. The production schema, backfill, RLS policies, and matching
  foreign-key indexes are live; the production build and browser checks pass;
  owner mutations for a ledger node, graph edge, Dream review, and decision
  memory passed inside a rolled-back transaction; an unaffiliated identity saw
  zero projects; and no verification rows persisted.
- Reasoning backfill: the live ledger contains existing evidence, questions,
  and decisions. New typed entries count as activity for the next Dream.
- Supabase advisor after the reasoning migration: no critical findings and no
  unindexed foreign keys. Newly created indexes are reported as unused until
  production traffic exercises them. The existing password-protection warning
  remains inapplicable to the passwordless-only flow.
- npm audit: no high or critical findings; two moderate PostCSS findings in the
  installed Next.js release.
