# Product Spine

LoopThing turns local Codex and Claude Code history into a handoff artifact for the next chat, agent, collaborator, or future self.

It is a local CLI and portable file format. The CLI reads structured Codex rollout JSONL, Claude Code project JSONL, Markdown, text, and JSON sources, extracts the project thesis, key user messages, decision shifts, killed branches, risks, next actions, and important source files, then seals the result into a `.loopthing` zip container.

## Wedge

The strongest product direction is handoff.

People already copy-paste old chats into new chats because they know the useful context is in there. But the stronger version is local-history first: scan Codex and Claude Code conversations on disk, preserve exact roles where possible, and only fall back to pasted transcript parsing when structured history is unavailable.

LoopThing replaces that manual behavior with a structured compression pass.

## Job

Given a messy project folder, transcript, or selected set of local Codex / Claude Code conversations, produce the smallest useful artifact that lets a recipient inherit the reasoning without reading the raw source.

The output separates the jobs:

- `brief.md`: the concise, sendable takeaway.
- `reasoning.md`: the fuller audit trail.
- `agent-guide.md`: instructions for future AI agents about read order, source confidence, and pasted-transcript ambiguity.
- `agent-handoff.md`: paste-ready context for a fresh session.
- `source-audit.md`: readable receipt of exactly which files were included in the run.

That recipient might be:

- a new AI session
- Codex
- a collaborator
- a cofounder
- future you

## What The Artifact Must Preserve

- The real intent beneath the stated request.
- The final problem framing.
- Key user messages that moved the work.
- Decision shifts from earlier branches to what was bounded, rejected, or kept.
- Discarded branches with reasons.
- Risks that could falsify the direction.
- The committed next action.
- The key local files a recipient should open first.

## What It Is Not

- Not a memory feature.
- Not a generic chat summary.
- Not a beautiful archive of everything.
- Not a dashboard that proves value through UI alone.

Compression quality is the product.

The current deterministic renderer builds a project model before writing Markdown. That means it tries to infer the current thesis, current wedge, boundaries, risks, discarded branches, next actions, source audit, and source-role confidence before rendering the final handoff.
