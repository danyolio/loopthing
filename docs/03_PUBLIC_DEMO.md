# Public Demo

`index.html` is a static public page for explaining LoopThing without asking someone to read the repo.

It is intentionally simple:

- no framework
- no backend
- no build step
- no live file parsing

The page should make one thing obvious:

> LoopThing turns local Codex and Claude Code history into a compact reasoning handoff.

## Current Story

The page is built from the latest local run in `demo/current-run/`.

It should show:

- the source shape
- the compression score
- the handoff artifact
- the discarded-branches idea
- the command that produced the container

## Hosting

This can be hosted as a single static file on `loopthing.ai`.

If the page becomes public, keep the copy close to the product spine in `docs/01_PRODUCT.md` and the latest generated output in `demo/current-run/`.
