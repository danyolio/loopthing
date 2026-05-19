# LoopThing

LoopThing compresses AI work into a handoff artifact.

It takes messy chats, project notes, prompts, and generated files, then extracts the load-bearing structure: **decisions, direction, critical turns, discarded paths, risks, asks, and next actions**.

The product is not "summarize this chat." It is closer to **compression for thinking**: make the reasoning small enough to hand into a new chat, agent session, collaborator, project, or future self without losing the moves that mattered.

Public one-liner: **LoopThing compresses messy AI work into a handoff artifact for the next chat, agent, collaborator, or future self.**

## The Short Version

```bash
node bin/loopthing.mjs create ./transcripts --out my-project.loopthing --title "My project"
```

That creates:

- `reasoning.md`: the compressed handoff
- `agent-handoff.md`: paste-ready context for a new chat/session/agent
- `source-metadata.json`: source shape, topic tags, counts, hashes
- `compression-score.md`: local quality checks
- `my-project.loopthing`: the portable container

## What We Are Building

LoopThing is the best way to compress:

- decisions
- direction
- thinking
- killed ideas
- project lineage
- agent-readable next context

So a new chat/session/project does not start cold.

Product loops are the self-healing process around it: run the product, read what failed, improve the product, record the loop, run it again.

## Try It On This Repo

```bash
node bin/loopthing.mjs create README.md PROMPT.md loops loopthing-source/Metadata loopthing-source/Prompts loopthing-source/Thinking "loopthing-source/Generated Explainers" docs/PUBLIC_COPY.md docs/CLI_USAGE.md docs/PRODUCT_SPINE.md docs/PROJECT_MAP.md docs/PRESSURE_TEST.md docs/IMPROVEMENT_BACKLOG.md test/fixtures/codex-project-chat.md --out tmp/loopthing-folder.loopthing --run-dir tmp/loopthing-folder-run --title "LoopThing Project Folder + Current Chat"
```

Then open:

- `tmp/loopthing-folder-run/reasoning.md`
- `tmp/loopthing-folder-run/agent-handoff.md`
- `tmp/loopthing-folder-run/source-metadata.json`
- `tmp/loopthing-folder.loopthing`

## Repo Map

```text
bin/                 actual CLI product
docs/                short human docs
index.html           static demo viewer
loopthing-source/    source files for the demo .loopthing container
loops/               product loop workbench and decision history
test/                fixtures and smoke tests
tmp/                 generated local outputs, ignored by git
```

The important files:

- [bin/loopthing.mjs](bin/loopthing.mjs): product CLI
- [docs/CLI_USAGE.md](docs/CLI_USAGE.md): usage guide
- [docs/PRODUCT_SPINE.md](docs/PRODUCT_SPINE.md): what the product is
- [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md): what each folder is for
- [docs/PRESSURE_TEST.md](docs/PRESSURE_TEST.md): current product pressure test
- [docs/IMPROVEMENT_BACKLOG.md](docs/IMPROVEMENT_BACKLOG.md): product improvement queue

## Demo Viewer

Open `index.html` in a browser. It shows the example `loopthing.loopthing` container.

No build step. No backend. No framework.

If this goes on `loopthing.ai`, treat [docs/PUBLIC_COPY.md](docs/PUBLIC_COPY.md) as the source of truth. The demo score is a structural smoke score: it checks that required outputs exist. It does not certify that every old internal note or historical artifact is semantically consistent.

## Validate

```bash
npm run test:product
npm run loop:list
```
