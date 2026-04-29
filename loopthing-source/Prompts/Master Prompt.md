# Master Prompt

Build the LoopThing of LoopThing itself.

A `.loopthing` is a rich portable container file for AI work. It turns a chat session into generated explainers and artifacts that help another person understand, visualize, and appreciate the thinking behind a project.

The demo should make the sharer look thoughtful, not messy. It should turn a chaotic AI session into something another person can skim, trust, fork, and learn from. The creator should feel powerful sharing it, like sending a modern PDF or slide deck that also contains prompts, code, screenshots, prototypes, and provenance.

## Product Shape

Create a static viewer for `loopthing.loopthing`, the actual container file.

The repo may keep `loopthing-source/` as the unpacked source tree so GitHub can display the contents, but the artifact people share is the single `loopthing.loopthing` file.

## Container Contents

Use simple, obvious sections:

- `Prompts`: the master prompt, initial prompt, follow-ups, and a one-line change log.
- `Thinking`: the sanitized narrative, journey map, and discarded ideas.
- `Drafts`: rough drafts that show the idea getting better.
- `Generated Explainers`: problem statement, solution overview, how it works, relevant context, and share brief.
- `Artifacts`: screenshots, docs, slides, prototypes, code, and the one-liner.
- `Container`: manifest and filetype metadata.

## Must Communicate

LoopThing began as an OpenAI Codex hackathon demo. It first used OpenClaw as the source artifact, then briefly explored "LoopThing a GitHub repo." That branch was killed because a repo is an output, not the thinking loop.

The winning idea is that AI work needs a filetype for the loop itself, and that the file should generate new context artifacts from the loop rather than merely preserve the transcript.

## Tone

Plain, confident, and generous to the creator. The viewer should feel like opening a clean project dossier, not reading someone's messy chat history.

## One-Liner

A `.loopthing` is a rich portable file for AI work: prompts, follow-ups, discarded ideas, drafts, generated explainers, screenshots, docs, slides, prototypes, and code that show how an idea arrived.
