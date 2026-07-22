# Loopthing

Loopthing is a continuous-thinking workspace for work that develops over more
than one sitting. A person or team can add unfinished ideas, sources, questions,
decisions, and alternatives over time. Loops connect new material to the
existing reasoning, challenge it, and propose a clearer next state without
silently changing the accepted document.

It is designed for strategy, research, investment theses, planning, design
reviews, long-form writing such as essays and blog posts, and hiring decisions.

## What is included

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and shadcn/ui
- Supabase passwordless authentication, Postgres, Row Level Security,
  invitations, and private Storage
- Tiptap with Yjs, IndexedDB recovery, Hocuspocus WebSockets, awareness, and
  immutable checkpoints
- Sources and uploads, questions, decisions, comments anchored to selected
  document text, branches, review, restoration, and history
- Passage, section, and document-level AI conjecture and criticism, including
  specific positive judgment and durable human responses
- Light, daily, and weekly Loops on Vercel Workflow DevKit
- Selectable Gemini or OpenAI synthesis through one Zod-validated output
  contract
- Vercel Web Analytics, Speed Insights, structured logs, authenticated cron,
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

Use `vercel dev` when testing the Vercel WebSocket upgrade or Workflow runtime.

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
GOOGLE_GENERATIVE_AI_MODEL=gemini-3.6-flash
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6-sol
LOOPTHING_AI_PROVIDER=google
REDIS_URL
```

At least one AI provider key is required to run a Loop. Gemini is configured
and verified locally and in production. The OpenAI/Codex path is implemented,
but it remains unavailable until `OPENAI_API_KEY` is added. `REDIS_URL` is not
needed for one Hocuspocus instance; add shared Redis before relying on
cross-instance realtime fan-out.

Apply the ordered SQL files in `supabase/migrations/` to a Supabase project.
Every exposed project table uses RLS. Privileged scheduled functions live in
the private schema behind narrow, secret-validated wrappers.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev --audit-level=moderate
```

The production flow was verified end to end on 19 July 2026: passwordless
sign-in, protected routes, project creation, realtime editing, autosave and
manual history, restoration, sources and private uploads, questions, decisions,
comments, branches, invitations, role policies, Gemini synthesis, proposal
acceptance, and manual/daily/weekly durable Loops.

## Deployment

The Vercel project is configured by `vercel.json`. Production deploys use:

```bash
vercel --prod --yes
```

The production application is live at
[`https://www.loopthing.ai`](https://www.loopthing.ai). Vercel serves the web
application, API routes, WebSocket endpoint, cron, and Workflow jobs. Supabase
remains the durable backend for authentication, data, policies, and files.

## Canonical product documents

- [`docs/loopthing-core-system-prompt-v2.md`](docs/loopthing-core-system-prompt-v2.md)
- [`docs/loopthing-project-checklist.md`](docs/loopthing-project-checklist.md)
- [`docs/01_PRODUCT.md`](docs/01_PRODUCT.md)
- [`docs/MVP_ACCEPTANCE_CRITERIA.md`](docs/MVP_ACCEPTANCE_CRITERIA.md)
