# LoopThing Clean Reasoning Handoff
*A LoopThing reasoning artifact compressed from 17 messages across 9 source files.*

## Intent

Clean up the project into something readable, improve the actual LoopThing product, run it on the cleaned folder, and use the resulting artifact as the source of truth for the public static page.

## Problem

The project had too many folders and stale artifacts. A structural compression score looked good, but public docs and presentation material still contradicted each other. The product needs to prove that it can find the gold, not just package clutter.

## Current thesis

LoopThing turns local Codex and Claude Code history into a handoff artifact for the next chat, agent, collaborator, or future self.

## Current wedge

The strongest product direction is handoff.

## Source shape

- chat-transcript: 9
- docs: 5
- source: 2
- orientation: 1

## Recent human directions

- Memory but better is probably wrong. Labs will ship memory for free and with better integration. The category has to be multiplayer handoff, not single-player personalization.
- If it compressed 103 messages across 89 files and scored 7/7, why is there a tonne of inconsistent information in all of the docs and presentation artefact? I might host the index.html file on the loopthing.ai domain.
- Ignore the fact that it is a GitHub repo for now and completely clean up the structure so I can read through it easily.
- Improve the product and run the tool, then use that output to revamp the index page.
- Keep everything old in an archive. Don't delete anything.
- Intent Clean up the project into something readable, improve the actual LoopThing product, run it on the cleaned folder, and use the resulting artifact as the source of truth for the public static page.

## Key user messages

These are the human-authored turns or source signals the next reader should privilege over assistant monologues.

- **user signal · current-project-chat.md** (`source/current-project-chat.md`): Show-your-work format for recipients is weak. Recipients mostly read conclusions, not working-out. Handoff is stronger because it has a falsifiable test.
- **user signal · current-project-chat.md** (`source/current-project-chat.md`): Does the handoff artifact let a new person continue the work?
- **user signal · current-project-chat.md** (`source/current-project-chat.md`): Which discarded branch would a recipient still accidentally reopen?
- **user signal · current-project-chat.md** (`source/current-project-chat.md`): Is the public page explaining the product or flattering a weak artifact?
- **user signal · current-project-chat.md** (`source/current-project-chat.md`): If it compressed 103 messages across 89 files and scored 7/7, why is there a tonne of inconsistent information in all of the docs and presentation artefact? I might host the index.html file on the loopthing.ai domain.
- **user signal · current-project-chat.md** (`source/current-project-chat.md`): Copy and pasting some chats into new chats is the manual version of the product. They grab everything. That's the problem. I don't know where my gold is.

## Supporting conclusions

Use these as conclusions to verify, not as a substitute for the key user messages.

- **assistant conclusion · current-project-chat.md** (`source/current-project-chat.md`): The root should show the current product, the archive should preserve old material, and the public page should be generated from the latest run rather than stale screenshots or old positioning.

## Decision shifts

| Earlier branch | What changed | Evidence | Why it matters |
| --- | --- | --- | --- |
| Raw archive as product | Bounded or rejected | storing everything preserves the mess instead of compressing it. | Preserve this as a settled boundary unless new evidence reopens it. |
| Viewer-first polish | Bounded or rejected | a beautiful page can hide weak compression. The artifact has to be useful before the viewer earns trust. | Preserve this as a settled boundary unless new evidence reopens it. |
| Test fixtures as current source | Bounded or rejected | fixtures are validation material, not the living project context. Including them made old Ralph-loop planning appear in the fresh output. | Preserve this as a settled boundary unless new evidence reopens it. |
| GitHub repo framing | Bounded or rejected | the current task is readability and product direction, not repository presentation or commit history. | Preserve this as a settled boundary unless new evidence reopens it. |

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

- The current direction is compression-first handoff. The root should show the current product, the archive should preserve old material, and the public page should be generated from the latest run rather than stale screenshots or old.
- Run the compression test on 20 real chats, compare LoopThing output against a generic summary, and ask recipients whether they can continue the work without reading the original transcript.
- The project-level run ignores archive/, tmp/, runs/, nested generated loopthing/ output, generated current-run/ output, and test/ fixtures. The curated current source material lives in source/current-project-chat.md.

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

- The current direction is compression-first handoff. The root should show the current product, the archive should preserve old material, and the public page should be generated from the latest run rather than stale screenshots or old.
- Run the compression test on 20 real chats, compare LoopThing output against a generic summary, and ask recipients whether they can continue the work without reading the original transcript.
- The project-level run ignores archive/, tmp/, runs/, nested generated loopthing/ output, generated current-run/ output, and test/ fixtures. The curated current source material lives in source/current-project-chat.md.

Not committed to:

- Not a memory feature.
- Not a generic chat summary.
- Not a beautiful archive of everything.
- Not a dashboard that proves value through UI alone.

Evidence to check:

- No specific evidence bullets inferred.

## Next action

- Run the compression test on 20 real chats, compare LoopThing output against a generic summary, and ask recipients whether they can continue the work without reading the original transcript.

## Asks

- Does the handoff artifact let a new person continue the work?
- Which discarded branch would a recipient still accidentally reopen?
- Is the public page explaining the product or flattering a weak artifact?

## Meta

Compressed from 17 messages. Token estimate: 5,348 input tokens, 5,157 output tokens. Topic tags: handoff, compression, brand, business, product, life-design, format, discarded-ideas. Caveat: this compression is deterministic and local; review it before sending.
