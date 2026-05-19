# Product Spine

## Product Claim

LoopThing is compression for AI reasoning.

It compresses decisions, direction, and thinking into a handoff artifact that can be passed into a new chat, new agent session, collaborator, project, or future self.

## Why This Matters

AI work now happens in long messy sessions. The value is not only in the final output. It is in the turns:

- what the user was really trying to decide
- what changed
- what got killed
- why it got killed
- what survived
- what happens next

Raw chats keep everything. Summaries flatten everything. LoopThing tries to keep the load-bearing moves.

## Core Object

The core output is:

```text
reasoning.md
agent-handoff.md
source-metadata.json
compression-score.md
your-project.loopthing
```

The `.loopthing` file is the sealed portable container. The product value lives first in `reasoning.md` and becomes immediately useful through `agent-handoff.md`.

## Best Use Cases

- hand a messy project into a new ChatGPT/Codex/Claude session
- hand off thinking to a cofounder or teammate
- compress a product direction after a long AI session
- preserve killed branches so they do not get re-litigated
- give agents an optimistic, self-healing project memory

## Handoff Test

Paste `agent-handoff.md` into a fresh AI session.

If the new session understands the direction, does not reopen killed branches, and can take the next action, LoopThing worked.

## Current Product Loop

1. Run LoopThing on a real chat/project.
2. Read the compressed output.
3. Notice what it missed or distorted.
4. Improve the compressor.
5. Record the product loop.
6. Run it again.

That is the actual product development method now.
