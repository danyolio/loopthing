# Agent Guide: LoopThing Clean

This file is for AI agents and collaborators navigating the run directory.

## Read order

1. `brief.md` — short, sendable conclusion.
2. `reasoning.md` — deeper audit trail with key user messages, decision shifts, boundaries, and risks.
3. `agent-handoff.md` — paste-ready state for a fresh AI session.
4. `source-audit.md` — exact file receipt for the run.
5. `source-metadata.json` — token estimates, provider counts, role confidence, source hashes.
6. `compression-score.md` — structural smoke test, not semantic truth.

## Source handling

- Trust exact-role Codex and Claude Code JSONL before pasted transcript text.
- Treat inferred pasted-chat roles as lower confidence; assistant text may appear inside user-pasted material.
- If a user direction sounds like an assistant offer or question, verify it against the source before acting on it.
- Do not treat long assistant monologues as the user's intent unless the user explicitly adopted them.

## Current state

- Thesis: LoopThing turns local Codex and Claude Code history into a handoff artifact for the next chat, agent, collaborator, or future self.
- Wedge: The strongest product direction is handoff.
- Next action: Run the compression test on 20 real chats, compare LoopThing output against a generic summary, and ask recipients whether they can continue the work without reading the original transcript.

## Guardrails

- Not a memory feature.
- Not a generic chat summary.
- Not a beautiful archive of everything.
- Not a dashboard that proves value through UI alone.
