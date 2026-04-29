# LoopThing

LoopThing is a package format for AI work: a forkable, auditable collection of the looping thoughts, branches, killed ideas, revisions, and artifacts behind how an idea arrived.

It is not just a chat summary. It is a portable artifact for exploratory work: the cleaned-up prompt trail, the branches that mattered, the ideas that were killed, the reasons they were killed, and the outputs that came out of the session.

Git tracks code diffs. LoopThing packages thinking loops.

This example began as an OpenAI Codex hackathon demo. It went through several revisions, including a GitHub-repo input version, before landing on the current idea: you do not LoopThing a repo; you LoopThing the exploratory AI session that produced the repo, slides, docs, code, and decisions.

## What Is In This Repo

- `index.html` is the vanilla JS viewer. No build step, backend, framework, login, or install.
- `loopthing.loopthing/` is the self-referential package: the LoopThing of LoopThing itself.
- `openclaw.loopthing` is an earlier reverse-engineered origin trace for Peter Steinberger's OpenClaw project.
- `PROMPT.md` is the refined build prompt distilled from feedback.

## Demo

Open `index.html` in a browser. The top bar is prefilled with the sanitized LoopThing feedback session; press `Enter` to open the package browser.

## Screenshots

The viewer opens a `.loopthing` as a browsable package, with the sanitized prompt as the entrypoint.

![LoopThing package start](docs/screenshots/01-package-start.png)

The lineage investigation shows the true initial prompt, the OpenAI Codex hackathon origin, and the killed GitHub-repo direction.

![LoopThing lineage and track changes](docs/screenshots/02-lineage-track-changes.png)

The thought graph keeps the pruned branches visible, including why "LoopThing a GitHub repo" lost.

![LoopThing thought graph](docs/screenshots/03-thought-graph.png)

Generated artifacts travel inside the package too, such as the slide artifact below.

![LoopThing slide artifact](docs/screenshots/04-slide-artifact.png)

The package can also carry working code artifacts, like the tiny viewer example included here.

![LoopThing viewer code artifact](docs/screenshots/05-viewer-code-artifact.png)

## What It Shows

The viewer renders a `.loopthing` package like a tiny file OS:

- `START.md`
- sanitized prompts
- true initial prompt excerpts
- line-by-line user-input track changes
- thought graph data
- slides
- viewer code
- package format notes

The core entrypoint is the sanitized prompt. The sub-investigation shows how the user's directions changed over time, including killed ideas and the reasons they were killed.

The lineage explicitly captures the OpenAI Codex hackathon origin, the OpenClaw demo phase, the killed GitHub-repo direction, and the subsequent user-input summaries from this chat thread.

## Why It Exists

Modern AI work starts in chat. That chat becomes the primitive: prompts, follow-ups, discarded ideas, rough drafts, screenshots, docs, slides, prototypes, and code.

Today those loops either stay as unreadable session history or get compressed into a final artifact where the useful process disappears. LoopThing turns that session mess into something readable, skimmable, and safe to share.

## Package Format

The example `.loopthing` is a directory-style package:

```text
loopthing.loopthing/
  manifest.loop
  START.md
  investigations/
    user-input-track-changes.md
  graph/
    thought-dag.loopgraph
  artifacts/
    slides/the-missing-artifact.html
    viewer-os-example.html
    spec/package-format.md
    brief/one-liner.md
```

The package can contain structured graph data, but the `.loopthing` itself is not a JSON file. It is a portable collection of files and artifacts.

## Notes

This is a static demo artifact, not a generator. The MVP idea is sanitized inputs first: preserve the human prompt trail and artifact references as the canonical proof, rather than dumping raw AI responses.
