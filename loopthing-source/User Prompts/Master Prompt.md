# Master Prompt

Build the LoopThing of LoopThing itself.

A `.loopthing` is a portable container file for AI work. It packages the user prompts, cleaned thought process, journey map, killed directions, and produced artifacts that explain how an idea arrived.

The demo should make the sharer look thoughtful, not messy. It should turn a chaotic AI session into something another person can skim, trust, fork, and learn from.

## Product Shape

Create a static viewer for `loopthing.loopthing`, the actual container file.

The repo may keep `loopthing-source/` as the unpacked source tree so GitHub can display the contents, but the artifact people share is the single `loopthing.loopthing` file.

## Container Contents

Use simple, obvious sections:

- `User Prompts`: the master prompt, raw user prompts, and a one-line change log for each later user direction.
- `Thought Process`: the sanitized narrative, journey map, killed directions, and container format.
- `Artifacts`: slides, viewer repo code, and the one-liner.
- `Container`: manifest and filetype metadata.

## Must Communicate

LoopThing began as an OpenAI Codex hackathon demo. It first used OpenClaw as the source artifact, then briefly explored "LoopThing a GitHub repo." That branch was killed because a repo is an output, not the thinking loop.

The winning idea is that AI work needs a filetype for the loop itself.

## Tone

Plain, confident, and generous to the creator. The viewer should feel like opening a clean project dossier, not reading someone's messy chat history.

## One-Liner

A `.loopthing` is a portable file for AI work: the prompts, decisions, killed branches, journey map, and artifacts behind how an idea arrived.
