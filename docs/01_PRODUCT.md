# Product Spine

LoopThing turns local Codex and Claude Code history into a handoff artifact for the next chat, agent, collaborator, or future self.

It is a local CLI and portable file format. The CLI reads structured Codex rollout JSONL, Claude Code project JSONL, Markdown, text, and JSON sources, extracts the project thesis, pivots, killed branches, risks, next actions, and important source files, then seals the result into a `.loopthing` zip container.

## Wedge

The strongest product direction is handoff.

People already copy-paste old chats into new chats because they know the useful context is in there. But the stronger version is local-history first: scan Codex and Claude Code conversations on disk, preserve exact roles where possible, and only fall back to pasted transcript parsing when structured history is unavailable.

LoopThing replaces that manual behavior with a structured compression pass.

## Job

Given a messy project folder, transcript, or selected set of local Codex / Claude Code conversations, produce the smallest useful artifact that lets a recipient inherit the reasoning without reading the raw source.

The output should read like a project-specific brief, not like chopped transcript excerpts.

That recipient might be:

- a new AI session
- Codex
- a collaborator
- a cofounder
- future you

## What The Artifact Must Preserve

- The real intent beneath the stated request.
- The final problem framing.
- Critical messages that moved the work.
- Framing diffs from old idea to new idea.
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

The current deterministic renderer builds a project model before writing Markdown. That means it tries to infer the current thesis, current wedge, boundaries, risks, discarded branches, next actions, and source map before rendering the final handoff.
