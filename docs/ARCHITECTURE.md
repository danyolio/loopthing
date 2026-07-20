# Loopthing architecture

## Deployment

- Vercel runs the Next.js application, Route Handlers, Gemini or OpenAI/Codex synthesis, Workflow DevKit jobs, cron triggers, and Hocuspocus WebSocket endpoint.
- Supabase is the durable system of record for PostgreSQL, passwordless email authentication, memberships, invitations, Row Level Security, private attachments, derived text, and immutable Yjs checkpoints.
- Yjs is the canonical collaborative document state. Plain text is derived for search, previews, diffs, and Loop context.
- Hocuspocus clients reconnect and keep an IndexedDB copy for local recovery. A single Vercel WebSocket instance is verified for launch. Shared Redis is required before relying on cross-instance realtime fan-out.
- Vercel Workflow DevKit is the selected durable job runner. Manual Loops,
  nightly Dreams, and weekly Loops share the same retryable, idempotent
  workflow.
- Supabase Storage is the selected source, transcript, and attachment store.

## Roles

| Capability | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| Read project, document, history, sources, Loops | Yes | Yes | Yes |
| Comment and resolve own comments | Yes | Yes | Yes |
| Edit the canonical document and thinking objects | Yes | Yes | No |
| Run Loops, create branches, accept proposals | Yes | Yes | No |
| Upload or remove sources and attachments | Yes | Yes | No |
| Invite members or change roles | Yes | No | No |
| Change project settings or delete the project | Yes | No | No |

## Trust boundaries

- The browser receives only the Supabase URL and publishable key.
- RLS is the final authorisation boundary for all project data.
- Server routes validate the authenticated user again before mutations.
- `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, and `CRON_SECRET` are Vercel-only secrets.
- Scheduled database functions are additionally gated by the SHA-256 hash of `CRON_SECRET`.
- Manual AI output never mutates canonical content directly. An accepted
  proposal is recorded with the accepting user and source Loop.
- A completed daily Dream returns structured conjecture and criticism. It may
  also return a full rewrite. The first Owner or Editor to open a proposed
  rewrite applies its Yjs state atomically. Every Dream can instead leave
  critique without changing the document. When a rewrite exists, the exact
  pre-Dream checkpoint and resulting checkpoint become a linked change set
  with a line diff and attribution separating human direction, Loopthing's
  independent choices, and preserved material. Either state can be restored
  as a new immutable version. The client compares the latest pair at block
  level and applies non-persistent ProseMirror decorations to the current
  document: matching Dream changes are purple, while blocks added or rewritten
  by people after that Dream are green. The source labels are
  presentation-only; hiding them never mutates Yjs content.
- `loop_insights.critique_comments` preserves immutable Dream interventions at
  passage, section, or document scope. Exact passage and heading anchors become
  ProseMirror decorations and markers without entering canonical Yjs content.
  `critique_reviews` stores the team's response and disposition. A database
  trigger mirrors that response into ordinary human project comments so it
  counts as activity and becomes context for the next Dream.
- Morning Review derives stable block changes from the linked pre-Dream and
  post-Dream versions. A disposition is stored in `dream_change_reviews`.
  Reverts create a new canonical checkpoint, feedback becomes green project
  input for the next Dream, and branches preserve the full Dream version.
- `reasoning_nodes` and `reasoning_edges` are the durable human-approved
  reasoning ledger. Sources, questions, and decisions synchronise into it.
  Each Loop also stores an immutable `reasoning_model` snapshot with its
  insight. The interface renders both through one directed-graph model.
- Decisions retain rejected alternatives, assumptions, reconsideration
  conditions, and review dates. Each Loop can store a `decision_alerts`
  snapshot when supplied evidence undermines one of those conditions.
- An Owner can create or refresh up to 20 invitations in one atomic database
  operation. Each invitation has its own email-bound, expiring token.
- Daily Dreams run around 03:00 AEST / 04:00 AEDT, only when activity has
  occurred since the previous Dream. The interface shows the exact next run in
  the viewer's local time.

## Launch boundaries

- Gemini is the configured and verified synthesis provider.
- OpenAI/Codex support is implemented but unavailable until `OPENAI_API_KEY` is
  configured and a production call is verified.
- Google OAuth is disabled and is not presented in the sign-in interface.
- Baseline security headers are enabled; a strict nonce-based Content Security
  Policy remains a follow-up because it must be validated against all dynamic
  script and connection sources.
