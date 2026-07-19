# Loop Thing architecture

## Deployment

- Vercel runs the Next.js application, Route Handlers, Gemini or OpenAI/Codex synthesis, Workflow DevKit jobs, cron triggers, and Hocuspocus WebSocket endpoint.
- Supabase is the durable system of record for PostgreSQL, passwordless email authentication, memberships, invitations, Row Level Security, private attachments, derived text, and immutable Yjs checkpoints.
- Yjs is the canonical collaborative document state. Plain text is derived for search, previews, diffs, and Loop context.
- Hocuspocus clients reconnect and keep an IndexedDB copy for local recovery. A single Vercel WebSocket instance is verified for launch. Shared Redis is required before relying on cross-instance realtime fan-out.
- Vercel Workflow DevKit is the selected durable job runner. Manual, daily, and weekly Loops share the same retryable, idempotent workflow.
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
- AI never mutates canonical content directly. An accepted proposal is recorded with the accepting user and source Loop.

## Launch boundaries

- Gemini is the configured and verified synthesis provider.
- OpenAI/Codex support is implemented but unavailable until `OPENAI_API_KEY` is
  configured and a production call is verified.
- Google OAuth is disabled and is not presented in the sign-in interface.
- Baseline security headers are enabled; a strict nonce-based Content Security
  Policy remains a follow-up because it must be validated against all dynamic
  script and connection sources.
