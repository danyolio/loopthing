# LoopThing Clean Reasoning Handoff
*A LoopThing reasoning artifact compressed from 17 messages across 9 source files.*

## Intent

Clean up the project into something readable, improve the actual LoopThing product, run it on the cleaned folder, and use the resulting artifact as the source of truth for the public static page.

## Problem

The project had too many folders and stale artifacts. A structural compression score looked good, but public docs and presentation material still contradicted each other. The product needs to prove that it can find the gold, not just package clutter.

## Current thesis

LoopThing compresses messy AI work into a handoff artifact for the next chat, agent, collaborator, or future self.

## Current wedge

The strongest product direction is handoff.

## Source shape

- chat-transcript: 9
- docs: 5
- source: 2
- orientation: 1

## Recent user directions

- Copy and pasting some chats into new chats is the manual version of the product. They grab everything. That's the problem. I don't know where my gold is.
- Show-your-work format for recipients is weak. Recipients mostly read conclusions, not working-out. Handoff is stronger because it has a falsifiable test.
- Memory but better is probably wrong. Labs will ship memory for free and with better integration. The category has to be multiplayer handoff, not single-player personalization.
- If it compressed 103 messages across 89 files and scored 7/7, why is there a tonne of inconsistent information in all of the docs and presentation artefact? I might host the index.html file on the loopthing.ai domain.
- Ignore the fact that it is a GitHub repo for now and completely clean up the structure so I can read through it easily.
- Improve the product and run the tool, then use that output to revamp the index page.
- Keep everything old in an archive. Don't delete anything.
- Intent Clean up the project into something readable, improve the actual LoopThing product, run it on the cleaned folder, and use the resulting artifact as the source of truth for the public static page.

## Critical messages

These are the load-bearing files, messages, or artifacts the next reader should use first.

- **LoopThing** (`README.md`): LoopThing compresses messy AI work into a handoff artifact for the next chat, agent, collaborator, or future self.
- **Product Spine** (`docs/01_PRODUCT.md`): LoopThing compresses messy AI work into a handoff artifact for the next chat, agent, collaborator, or future self.
- **Run LoopThing** (`docs/02_RUN_LOOPTHING.md`): Run LoopThing on the current project folder:
- **Public Demo** (`docs/03_PUBLIC_DEMO.md`): index.html is a static public page for explaining LoopThing without asking someone to read the repo.
- **Product Improvements** (`docs/04_PRODUCT_IMPROVEMENTS.md`): These are the next product loops worth running.
- **Archive Map** (`docs/05_ARCHIVE_MAP.md`): Old material is preserved in archive/2026-05-08-readability-cleanup/.
- **package.json** (`package.json`): { "name": "loopthing", "version": "0.1.0", "private": true, "type": "module", "bin": { "loopthing": "./bin/loopthing.mjs" }, "scripts": { "test:product": "node test/product-smoke.mjs", "demo:create": "node.
- **current-project-chat.md** (`source/current-project-chat.md`): The current direction is compression-first handoff. The root should show the current product, the archive should preserve old material, and the public page should be generated from the latest run rather than stale.

## Framing diffs

| From | To | Trigger | Why it mattered |
| --- | --- | --- | --- |
| Copy and pasting some chats into new chats is the manual version of the... | Show-your-work format for recipients is weak. Recipients mostly read co... | Show-your-work format for recipients is weak. Recipients mostly read conclusions, not wor... | This changed the shape of the work and should keep future readers from replaying the older framing. |
| Show-your-work format for recipients is weak. Recipients mostly read co... | Memory but better is probably wrong. Labs will ship memory for free and... | Memory but better is probably wrong. Labs will ship memory for free and with better integ... | This changed the shape of the work and should keep future readers from replaying the older framing. |
| Memory but better is probably wrong. Labs will ship memory for free and... | If it compressed 103 messages across 89 files and scored 7/7, why is th... | If it compressed 103 messages across 89 files and scored 7/7, why is there a tonne of inc... | This changed the shape of the work and should keep future readers from replaying the older framing. |
| If it compressed 103 messages across 89 files and scored 7/7, why is th... | ## Intent Clean up the project into something readable, improve the act... | ## Intent Clean up the project into something readable, improve the actual LoopThing prod... | This changed the shape of the work and should keep future readers from replaying the older framing. |

## Discarded branches

- **Raw archive as product**
  - Rejected because: storing everything preserves the mess instead of compressing it.
- **Viewer-first polish**
  - Rejected because: a beautiful page can hide weak compression. The artifact has to be useful before the viewer earns trust.
- **Test fixtures as current source**
  - Rejected because: fixtures are validation material, not the living project context. Including them made old Ralph-loop planning appear in the fresh output.
- **GitHub repo framing**
  - Rejected because: the current task is readability and product direction, not repository presentation or commit history.

## What survives criticism

- None identified.

## Ownership and boundaries

- No explicit ownership model detected.

## What this is not

- Not a memory feature.
- Not a generic chat summary.
- Not a beautiful archive of everything.
- Not a dashboard that proves value through UI alone.

## Where the explanation might be wrong

- Compression quality: The deterministic extractor may still miss nuance or promote the wrong messages without model-backed reasoning.
- Handoff frequency: The handoff use case may be less frequent than the creator feels during active building.
- Public-page theatre: A strong static page can make the idea feel clearer than the product currently is, so the recipient test still matters.

## Outcome

Committed to:

- Preserve the current thesis, boundaries, killed branches, risks, and next evidence gate.
- Treat discarded branches as useful evidence, not trash.
- Produce a readable handoff that a new AI session or collaborator can use quickly.

Not committed to:

- Treating raw transcript storage as the product.
- Treating visual polish as proof of reasoning quality.
- Hiding uncertainty, risk, or inferred structure.

## Next action

- Run the compression test on 20 real chats, compare LoopThing output against a generic summary, and ask recipients whether they can continue the work without reading the original transcript.

## Asks

- Does the handoff artifact let a new person continue the work?
- Which discarded branch would a recipient still accidentally reopen?
- Is the public page explaining the product or flattering a weak artifact?

## Meta

Compressed from 17 messages. Topic tags: handoff, compression, brand, product, life-design, format, discarded-ideas. Caveat: this compression is deterministic and local; review it before sending.
