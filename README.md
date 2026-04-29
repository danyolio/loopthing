# loopThing

`loopThing` is a tiny static demo for a `.loopthing` file: an open artifact for showing how an idea arrived, not just the final thing it produced.

Git tracks code diffs. A `.loopthing` file tracks the prompt, critique, branch, revision, and prune decisions behind AI-assisted work. The important bit is the prune: losing branches remain visible, with the reason they were killed.

This repo contains a single-page viewer and one example trace:

- `index.html` is the vanilla JS viewer. No build step, backend, framework, login, or install.
- `openclaw.loopthing` is a reverse-engineered origin trace for Peter Steinberger's OpenClaw project.

## Demo

Open `index.html` in a browser. The OpenClaw repo URL is prefilled in the top bar; press `Enter` to populate the viewer.

For a hands-free walkthrough, open:

```text
index.html?walk=1
```

The walkthrough advances through the four simulated agents every six seconds.

## What It Shows

The viewer renders the `.loopthing` file as a small DAG of thought:

- prompts
- critiques
- revisions
- killed branches
- kill reasons
- cross-agent citations

The right rail keeps pruned siblings visible because that is the point of the format: pruned thought is evidence.

## File Format

The example file is plain JSON with a `.loopthing` extension:

```json
{
  "format": "loopthing/v0.1",
  "meta": {},
  "agents": [],
  "nodes": [],
  "edges": []
}
```

Each node records a moment in the loop. Kill nodes include a `kill_reason`, which is often more instructive than the branch that survived.

## Notes

This is a static demo artifact, not a generator. The OpenClaw trace is intentionally marked `source_kind: "reverse-engineered"` because the original chats were unavailable.
