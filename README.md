# LoopThing

LoopThing is a file format for turning AI chat into a compressed reasoning artifact.

It is not a transcript and not a "summarize this chat" wrapper. It extracts the load-bearing structure: intent, critical messages, framing diffs, discarded branches, risks, outcome, and next action.

**In this meta demo:** LoopThing itself was created from 67 chat messages across 3 AI tools. `loopthing.loopthing` contains 3 primitives and 5 artifact families.

## Why It Exists

People copy-paste old chats into new chats because they know there is gold in there, but they do not know where it is.

LoopThing is for that. You LoopThing your messages across multiple chat sessions to generate a handoff artifact: something a friend, cofounder, teammate, or future self can read in minutes and land where you landed.

The final output is not the only artifact. The reasoning can ship too.

## What Is A `.loopthing`

A `.loopthing` is a single portable container file with a MIME marker: `application/vnd.loopthing+zip`.

The thing you share is named for the project: `agent-docs.loopthing`, `openclaw-origin.loopthing`, `yourproject.loopthing`. This repo's example is `loopthing.loopthing`.

The narrow wedge: compress messy AI work into the minimum artifact that preserves the move.

The test: can someone who was not in the conversation read it in under five minutes and end up roughly where the creator ended up?

## What It Contains

This demo container has three core primitives:

- `Metadata/`: message counts, topic tags, and source-shape stats
- `Prompts/`: initial prompt, follow-ups, and one-line prompt changes
- `Thinking/`: journey map, discarded ideas, stress test, and process narrative

And five artifact families:

- `Generated Explainers/`: problem, solution, how it works, relevant context, share brief
- `Artifacts/Media/`: generated visual explainers
- `Artifacts/Screenshots/`: meta screenshots of the viewer explaining the repo
- `Artifacts/Slides/` and `Artifacts/Docs/`: presentation and reference material
- `Artifacts/Prototypes/` and `Artifacts/Code/`: runnable examples and source code

## Demo

Open `index.html` in a browser. The top bar is prefilled with the example container name; press `Enter` to browse the unpacked contents of `loopthing.loopthing`.

No build step. No backend. No framework. Just the viewer and the container.

## Screenshots

These are meta screenshots: the LoopThing viewer explains the thinking behind this repo, while the README stays focused on the concept.

The artifact stage keeps the thought object visible while a selected primitive or artifact opens in the lens.

![LoopThing meta artifact stage](docs/screenshots/01-meta-artifact-stage.png)

Chat metadata becomes a primitive: message counts, topic tags, and source-shape stats.

![LoopThing chat metadata](docs/screenshots/02-meta-chat-metadata.png)

The journey map is a whiteboard-style lineage view with boxes and arrows, inspired by Excalidraw's hand-drawn diagram style.

![LoopThing journey map](docs/screenshots/03-meta-journey-map.png)

Previous screenshot sets are kept for comparison in `docs/screenshots/archive/`.

## Potential Future Directions

The final `.loopthing` file is the entire exploration: portable, forkable, auditable.

Future versions could:

- Run the compression test across real chat corpuses before building more infrastructure.
- Generate `.loopthing` files from one chat, many chats, or a project workspace.
- Turn chat history into metadata, prompt lineage, framing diffs, discarded branches, and generated explainers.
- Package media, slides, prototypes, and code only when they help the handoff.
