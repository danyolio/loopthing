# LoopThing

LoopThing compresses messy AI work into a handoff artifact for the next chat, agent, collaborator, or future self.

It is not a transcript viewer and not "summarize this chat." It extracts the load-bearing shape of a project: intent, problem, critical messages, framing shifts, discarded branches, risks, decisions, and the next action.

## Why It Exists

AI work now happens across long chats, Codex sessions, notes, prototypes, screenshots, and docs. The gold is usually in the turns: the moment the framing changed, the branch that died, the reason a decision stuck.

LoopThing turns that mess into something sendable.

The test is simple: can someone who was not in the conversation read the artifact in under five minutes and land where the creator landed?

## The Current Product

The actual product is a local CLI:

```bash
node bin/loopthing.mjs create . \
  --out demo/loopthing-clean.loopthing \
  --run-dir demo/current-run \
  --title "LoopThing Clean Project Handoff"
```

That command creates:

- `demo/current-run/START_HERE.md`: the reading order.
- `demo/current-run/agent-handoff.md`: paste-ready context for a new AI session.
- `demo/current-run/reasoning.md`: the full compressed reasoning artifact.
- `demo/current-run/source-metadata.json`: message counts, source shape, topic tags, and file hashes.
- `demo/current-run/compression-score.md`: structural and readability smoke checks.
- `demo/loopthing-clean.loopthing`: a sealed portable container with MIME marker `application/vnd.loopthing+zip`.

The renderer now builds a project model before writing Markdown, so it tries to produce a readable project-specific handoff instead of chopped transcript snippets.

The latest checked-in demo was regenerated from the cleaned repo and compresses 17 messages across 9 source files. Its structural score is 13/13. That score is a shape check, not a claim that the reasoning is perfect; the recipient test is still the real bar.

## Quality Guardrails

`npm run test:product` now covers the product path end to end:

- fixture compression
- one-command create, score, compare, and seal
- a full self-run on this repo
- a regression that prevents a stray domain reference from hijacking the LoopThing demo output
- a positive test that the Future Allied domain adapter still activates when the source actually supports it

This matters because an earlier deterministic pass could score green while producing a semantically wrong handoff. The current domain selection is evidence-weighted so a single example mention in docs does not override the project identity.

## Project Map

```text
START_HERE.md     human front door
README.md         concept and current usage
index.html        static public demo page
bin/              LoopThing CLI product
docs/             short current docs
source/           current curated chat/context used by the demo run
demo/             latest generated output
test/             fixtures and product smoke test
archive/          old demos, screenshots, source folders, and prior loops
```

Everything historical is preserved in `archive/2026-05-08-readability-cleanup/`.

## Read Next

Start here:

- [START_HERE.md](START_HERE.md)
- [docs/01_PRODUCT.md](docs/01_PRODUCT.md)
- [docs/02_RUN_LOOPTHING.md](docs/02_RUN_LOOPTHING.md)
- [docs/03_PUBLIC_DEMO.md](docs/03_PUBLIC_DEMO.md)
- [docs/05_ARCHIVE_MAP.md](docs/05_ARCHIVE_MAP.md)
- [demo/current-run/START_HERE.md](demo/current-run/START_HERE.md)

## Validate

```bash
npm run test:product
```
