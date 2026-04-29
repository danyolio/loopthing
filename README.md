# LoopThing

LoopThing is a file format for AI work: a forkable, auditable record of the looping thoughts, branches, killed ideas, and revisions behind how an idea arrived.

It is not just a chat summary. It is a portable artifact for exploratory work: the cleaned-up prompt trail, the branches that mattered, the ideas that were killed, the reasons they were killed, and the outputs that came out of the session.

Git tracks code diffs. LoopThing tracks thinking loops.

## What Is In This Repo

- `index.html` is the vanilla JS viewer. No build step, backend, framework, login, or install.
- `loopthing.loopthing` is the self-referential trace: the LoopThing of LoopThing itself.
- `openclaw.loopthing` is an earlier reverse-engineered origin trace for Peter Steinberger's OpenClaw project.
- `PROMPT.md` is the refined build prompt distilled from feedback.

## Demo

Open `index.html` in a browser. The top bar is prefilled with the sanitized LoopThing feedback session; press `Enter` to populate the viewer.

For a hands-free walkthrough, open:

```text
index.html?walk=1
```

The walkthrough advances through the four simulated agents every six seconds.

## What It Shows

The viewer renders a `.loopthing` file as a small DAG of thought:

- sanitized prompts
- critiques
- revisions
- killed branches
- kill reasons
- cross-agent citations
- artifact references

The right rail keeps pruned siblings visible because that is the point of the format: pruned thought is evidence.

## Why It Exists

Modern AI work starts in chat. That chat becomes the primitive: prompts, follow-ups, discarded ideas, rough drafts, screenshots, docs, slides, prototypes, and code.

Today those loops either stay as unreadable session history or get compressed into a final artifact where the useful process disappears. LoopThing turns that session mess into something readable, skimmable, and safe to share.

## File Format

The example file is plain JSON with a `.loopthing` extension:

```json
{
  "format": "loopthing/v0.1",
  "meta": {},
  "agents": [],
  "nodes": [],
  "edges": [],
  "artifacts": []
}
```

Each node records a moment in the loop. Kill nodes include a `kill_reason`, which is often more instructive than the branch that survived.

## Notes

This is a static demo artifact, not a generator. The MVP idea is sanitized inputs first: preserve the human prompt trail and artifact references as the canonical proof, rather than dumping raw AI responses.
