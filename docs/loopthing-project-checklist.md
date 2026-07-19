# Loop Thing — Project Specification and Build Checklist

Only completed work is checked. This file is updated after implementation and verification, not before.

## Product specification

- Loop Thing is a collaborative continuous-thinking workspace for work that evolves over days, weeks, or months.
- The document is a living problem and the primary interface.
- The product should feel closer to Linear, Figma, and Notion than to ChatGPT.
- The AI behaves as an embedded persistent collaborator rather than a chatbot.
- Every Loop returns structured insight that improves clarity, decisions, and reasoning rather than prose alone.
- Lightweight Loops respond to meaningful events, deep Loops run daily by default, and strategic synthesis runs weekly.
- Human work remains canonical until a user accepts an AI proposal.
- Significant alternatives appear as branches instead of silent rewrites.
- Version history preserves human edits, AI proposals, evidence, decisions, questions, and rationales.
- Initial use cases include strategy, research, investment, planning, design reviews, long-form writing, and hiring decisions.

## Technical specification

- The web application uses Next.js App Router, React, and TypeScript.
- Tailwind CSS provides the styling system and shadcn/ui provides editable component source.
- Tiptap provides the document editor.
- Supabase provides PostgreSQL, magic-link and Google authentication, project memberships, invitations, and Row Level Security.
- Every project assigns each member the Owner, Editor, or Viewer role.
- Yjs and Hocuspocus provide document synchronisation, cursors, awareness, reconnection, and offline editing.
- Immutable Yjs checkpoints provide canonical history while derived plain text supports AI analysis, search, previews, and diffs.
- The Vercel AI SDK and `@ai-sdk/google` connect server-side synthesis to Gemini.
- `gemini-3.5-flash` is the pinned synthesis model.
- `GOOGLE_GENERATIVE_AI_API_KEY` stores the Gemini credential as a server-only environment secret.
- OpenAI is a selectable synthesis provider through `@ai-sdk/openai`; `gpt-5.6-sol` is the initial OpenAI/Codex model.
- `OPENAI_API_KEY` stores the OpenAI credential as a server-only environment secret.
- AI SDK `Output.object()` and Zod validate every Loop result.
- Vercel Workflow DevKit executes scheduled Loops with idempotency, retries, and genuine progress stages.
- The MVP is a responsive Next.js web application, while a future Expo application may share types, schemas, API clients, authentication, and domain logic.

## Decisions

- [x] Use Vercel Workflow DevKit as the durable job runner.
- [x] Deploy Next.js, Workflow jobs, cron, and the Hocuspocus WebSocket endpoint on Vercel; use Supabase as durable state.
- [x] Store sources, transcripts, and attachments in private Supabase Storage.
- [x] Define Owner, Editor, and Viewer capabilities.

## Build tasks

- [x] Create the concise Loop Thing core system prompt.
- [x] Consolidate the product and technical specifications into a skimmable checklist.
- [x] Define the MVP happy path and measurable acceptance criteria.
- [x] Scaffold Next.js with TypeScript, Tailwind CSS, and shadcn/ui.
- [x] Configure Supabase, authentication, project memberships, invitations, API grants, and Row Level Security.
- [ ] Add `GOOGLE_GENERATIVE_AI_API_KEY` to local and production server secrets without committing its value.
- [ ] Add `OPENAI_API_KEY` to local and production server secrets without committing its value.
- [x] Build the Tiptap document workspace.
- [x] Build Yjs and Hocuspocus collaboration with offline recovery.
- [x] Build comments, sources, questions, decisions, checkpoints, diffs, restoration, and branches.
- [x] Build Gemini and OpenAI/Codex synthesis with AI SDK structured outputs and Zod schemas.
- [x] Build light, daily, and weekly Loops with durable execution.
- [x] Build embedded insights, briefings, branch review, progress, and history.
- [x] Add automated tests, AI evaluations, security checks, privacy controls, limits, and monitoring.
- [ ] Seed, deploy, verify, and document the MVP.
