# LoopThing

LoopThing is a rich portable file for AI work: prompts, follow-ups, discarded ideas, drafts, generated explainers, screenshots, docs, slides, prototypes, and code that show how an idea arrived.

It is not just a chat summary. It takes a messy AI session and generates net new artifacts that help someone else understand the work: problem statements, solution explainers, journey maps, relevant context, visuals, slides, prototypes, and code views.

Git tracks code diffs. LoopThing packages and explains thinking loops.

This example began as an OpenAI Codex hackathon demo. It went through several revisions, including a GitHub-repo input version, before landing on the current idea: you do not LoopThing a repo; you LoopThing the exploratory AI session that produced the repo, slides, docs, code, decisions, and generated explainers.

## What Is In This Repo

- `index.html` is the vanilla JS viewer. No build step, backend, framework, login, or install.
- `loopthing.loopthing` is the actual portable container file. It is a zip-style filetype with the MIME marker `application/vnd.loopthing+zip`.
- `loopthing-source/` is the unpacked editing source for that container, included so GitHub can show the contents.
- `openclaw.loopthing` is an earlier reverse-engineered origin trace for Peter Steinberger's OpenClaw project.
- `PROMPT.md` is the refined build prompt distilled from feedback.

## Demo

Open `index.html` in a browser. The top bar is prefilled with the LoopThing container name; press `Enter` to browse the unpacked contents of `loopthing.loopthing`.

## Screenshots

The viewer opens a `.loopthing` as a rich portable file, with the master prompt as the entrypoint.

![LoopThing container start](docs/screenshots/01-package-start.png)

Prompts and follow-ups are the spine: the initial ask plus one-line summaries of later meta-level changes.

![LoopThing user prompts](docs/screenshots/02-lineage-track-changes.png)

LoopThing also generates net-new explainers, such as a problem statement, solution overview, relevant context, and share brief.

![LoopThing generated explainer](docs/screenshots/06-generated-explainer.png)

The journey map replaces the esoteric graph file with a readable flow of how the idea became sharper.

![LoopThing journey map](docs/screenshots/03-thought-graph.png)

Generated explainers and artifacts travel inside the container too, including slides that explain the problem, solution, and how it works.

![LoopThing slide artifact](docs/screenshots/04-slide-artifact.png)

The rich file can also carry working code artifacts, like the tiny viewer repo included here.

![LoopThing viewer code artifact](docs/screenshots/05-viewer-code-artifact.png)

## What It Shows

The viewer renders a `.loopthing` like a tiny file OS for AI work:

- `Prompts/Master Prompt.md`
- `Prompts/Initial Prompt.md`
- `Prompts/Follow Ups.md`
- `Prompts/Prompt Change Log.md`
- `Thinking/Process Narrative.md`
- `Thinking/Journey Map.md`
- `Thinking/Discarded Ideas.md`
- `Drafts/Rough Drafts.md`
- `Generated Explainers/Problem Statement.md`
- `Generated Explainers/Solution Overview.md`
- `Generated Explainers/How It Works.md`
- `Generated Explainers/Relevant Context.md`
- `Generated Explainers/Share Brief.md`
- `Artifacts/Screenshots/`
- `Artifacts/Docs/`
- `Artifacts/Slides/`
- `Artifacts/Prototypes/`
- `Artifacts/Code/`

The core entrypoint is the master prompt. The prompt files show how the user's directions changed over time, including discarded ideas and the reasons they were discarded.

The lineage explicitly captures the OpenAI Codex hackathon origin, the OpenClaw demo phase, the killed GitHub-repo direction, and the subsequent user-input summaries from this chat thread.

## Why It Exists

Modern AI work starts in chat. That chat becomes the primitive: prompts, follow-ups, discarded ideas, rough drafts, screenshots, docs, slides, prototypes, and code.

Today those loops either stay as unreadable session history or get compressed into a final artifact where the useful process disappears. LoopThing turns that session mess into a rich shareable artifact that makes the creator look clear, deliberate, and worth learning from.

## Container Format

The example `.loopthing` is a single container file. The repo includes `loopthing-source/` only so the contents are readable in GitHub:

```text
loopthing.loopthing
loopthing-source/
  mimetype
  manifest.loop
  Prompts/
    Master Prompt.md
    Initial Prompt.md
    Follow Ups.md
    Prompt Change Log.md
  Thinking/
    Process Narrative.md
    Journey Map.md
    Discarded Ideas.md
  Drafts/
    Rough Drafts.md
  Generated Explainers/
    Problem Statement.md
    Solution Overview.md
    How It Works.md
    Relevant Context.md
    Share Brief.md
  Artifacts/
    Screenshots/
    Docs/Container Format.md
    Slides/Problem Solution How It Works.html
    Prototypes/Viewer Prototype.html
    Code/Viewer Repo/
    One Liner.md
```

The `.loopthing` can contain structured data, but it is not JSON and it is not a folder. It is a portable container for the thinking loop and its artifacts.

## Notes

This is a static demo of the generated output, not a live generator. The product idea is that LoopThing takes the human prompt trail as the spine and generates the rich explainers and artifacts someone needs to understand and share the work.
