# Start Here

This folder has been cleaned into two tracks:

1. Current product: the files at the root, `bin/`, `docs/`, `demo/`, and `test/`.
2. History: everything old is preserved under `archive/2026-05-08-readability-cleanup/`.

## What LoopThing Is Now

LoopThing is a compression tool for AI work.

It takes messy chats, project docs, prompts, and notes, then produces a handoff artifact that shows the decisions, direction, discarded branches, risks, and next action.

The point is not to store everything. The point is to find the gold and make it easy to hand into a new chat, agent session, collaborator, or future self.

## What To Open

- `README.md`: concept and usage.
- `docs/01_PRODUCT.md`: the product spine.
- `docs/02_RUN_LOOPTHING.md`: exact commands.
- `demo/current-run/START_HERE.md`: the latest output from running LoopThing on this cleaned folder.
- `index.html`: the static public page built from that latest output.

## Run It

```bash
node bin/loopthing.mjs create . \
  --out demo/loopthing-clean.loopthing \
  --run-dir demo/current-run \
  --title "LoopThing Clean Project Handoff"
```

The CLI ignores `archive/`, `tmp/`, `.git/`, `node_modules/`, `test/`, and generated `current-run/` folders so running it on `.` stays focused on the current product.
