# Loop Thing

Loop Thing is a collaborative continuous-thinking workspace for work that
evolves over days, weeks, or months. The document remains the primary
interface; AI Loops connect changes, evidence, questions, decisions, and
alternatives without silently rewriting accepted human work.

## What is included

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and shadcn/ui
- Supabase Auth, Postgres, Row Level Security, invitations, and private Storage
- Tiptap with Yjs, IndexedDB offline recovery, Hocuspocus WebSockets, awareness,
  and immutable checkpoints
- Light, daily, and weekly Loops on Vercel Workflow DevKit
- Selectable Gemini or OpenAI/Codex synthesis through one Zod-validated output
  contract
- Sources and uploads, questions, decisions, comments, branches, review,
  restoration, progress, and history
- Vercel Web Analytics, Speed Insights, structured logs, cron authentication,
  and per-project Loop limits

The architecture and role matrix are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Product acceptance criteria are
in [`docs/MVP_ACCEPTANCE_CRITERIA.md`](docs/MVP_ACCEPTANCE_CRITERIA.md).

## Local setup

Use Node.js 24 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use `vercel dev` when testing the WebSocket upgrade and Vercel-specific runtime.

Required public environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

Server-only variables:

```text
CRON_SECRET
GOOGLE_GENERATIVE_AI_API_KEY
GOOGLE_GENERATIVE_AI_MODEL=gemini-3.5-flash
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6-sol
LOOPTHING_AI_PROVIDER=google
REDIS_URL
```

At least one AI provider key is needed to run a Loop. `REDIS_URL` is optional
for a single Hocuspocus instance and required before horizontal realtime
fan-out.

Apply the ordered SQL files in `supabase/migrations/` to a Supabase project.
Every exposed project table uses RLS; privileged scheduled RPC bodies live in
the private schema behind narrow invoker-safe wrappers.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For browser verification, check `/`, `/login`, the unauthenticated redirect from
`/app`, and an authenticated project flow. For the Vercel runtime, verify that
`ws(s)://<host>/api/ws` upgrades successfully and that
`/.well-known/workflow/v1/flow` responds to Workflow health checks.

## Deployment

The Vercel project is configured by `vercel.json`. Production deploys use:

```bash
vercel --prod
```

The daily cron endpoint claims both due daily and weekly runs and validates the
Vercel `Authorization: Bearer $CRON_SECRET` header. The intended production
domain is `loopthing.ai`.

The production deployment was verified on 19 July 2026 at
`https://loopthing-fp16rjp8v-danyolio.vercel.app`. Vercel has attached both
`loopthing.ai` and `www.loopthing.ai` to the project. Because DNS remains hosted
on Cloudflare, publish these two proxied-or-DNS-only records there before the
custom domain can resolve:

```text
A  @    76.76.21.21
A  www  76.76.21.21
```

Vercel will issue the certificates automatically after DNS verification.

## Canonical product documents

- [`docs/loopthing-core-system-prompt-v2.md`](docs/loopthing-core-system-prompt-v2.md)
- [`docs/loopthing-project-checklist.md`](docs/loopthing-project-checklist.md)
- [`docs/MVP_ACCEPTANCE_CRITERIA.md`](docs/MVP_ACCEPTANCE_CRITERIA.md)
