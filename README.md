# LoopThing

LoopThing is a file format for turning AI chat/project history into a shareable artifact that shows how an idea arrived.

**In this demo:** 67 chat messages and 14 topic tags become 3 primitives and 5 artifact families.

Tagline: **The human is the loop**

## Why It Exists

Have you ever wondered what your boss's initial prompt was?

Have you ever wondered how someone came up with an idea?

Have you ever wanted to share an AI project without dumping the whole messy chat?

LoopThing is for that. You LoopThing your chat session, multiple sessions, or project workspace to generate artifacts that demonstrate your thinking: the prompt spine, chat metadata, journey map, discarded ideas, explainers, media, slides, prototypes, and code.

The final output is not the only artifact. The thinking can ship too.

## What Is A `.loopthing`

A `.loopthing` is not JSON, not a folder, and not a transcript. It is a single portable container file with a MIME marker: `application/vnd.loopthing+zip`.

The thing you share is named for the project: `agent-docs.loopthing`, `openclaw-origin.loopthing`, `yourproject.loopthing`. This repo's example is `loopthing.loopthing`.

This demo container has three core primitives:

- `Metadata/`: message counts, topic tags, and source-shape stats
- `Prompts/`: initial prompt, follow-ups, and one-line prompt changes
- `Thinking/`: journey map, discarded ideas, and process narrative

And five artifact families:

- `Generated Explainers/`: problem, solution, how it works, relevant context, share brief
- `Artifacts/Media/`: generated visual explainers
- `Artifacts/Screenshots/`: meta screenshots of the viewer explaining the repo
- `Artifacts/Slides/` and `Artifacts/Docs/`: presentation and reference material
- `Artifacts/Prototypes/` and `Artifacts/Code/`: runnable examples and source code

## Ralph Loop

Ralph Loop is background machinery for generating the artifacts, not the headline.

In this context, a Ralph Loop means an agent generates, critiques itself, regenerates with fresh context, uses feedback, and repeats until the artifact set is worth sealing. The name references [`snarktank/ralph`](https://github.com/snarktank/ralph), an autonomous AI coding loop where fresh AI instances repeatedly work through PRD items, persist learnings, and use feedback checks.

LoopThing uses that looping idea to produce a sealed `.loopthing`: portable, forkable, auditable.

## True Lineage

This began as an OpenAI Codex hackathon idea.

The first demo imagined working backward from Andrej Karpathy's LLMWiki: four agents reconstruct plausible origin paths such as compression, pedagogy, tooling, and canon.

The next version introduced Ralph Loop and the demo question: "What could documentation be when agents read it?"

The early live repo then tried to understand what Peter Steinberger was building with OpenClaw by working backward from the repo. That helped ship a static viewer fast, but it was the wrong center of gravity. A repo is usually an output of the thinking process, not the process itself.

The current version is the LoopThing of LoopThing: a portable file generated from this conversation, with metadata, prompt lineage, a whiteboard-style journey map, generated explainers, media, screenshots, slides, prototype, and code.

## Demo

Open `index.html` in a browser. The top bar is prefilled with the example container name; press `Enter` to browse the unpacked contents of `loopthing.loopthing`.

No build step. No backend. No framework. Just the viewer and the container.

## Screenshots

These are meta screenshots: the LoopThing viewer is explaining the why behind this repo.

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

- Generate `.loopthing` files from one chat, many chats, or a project workspace.
- Turn chat history into metadata, prompt lineage, journey maps, and generated explainers.
- Preserve discarded ideas and the reason each branch died.
- Package media, slides, prototypes, and code so the artifact feels closer to a rich PDF for AI work.
