# User Input Track Changes

This investigation shows how the idea moved from the true initial prompt to the current LoopThing package concept.

The spine is user input only from this exact chat thread. AI responses are not treated as the canonical record; they are supporting material. The proof is the sequence of human directions, edits, constraints, and reversals.

## Lineage Summary

LoopThing began here as an OpenAI Codex hackathon demo: a static viewer that had to open in a browser quickly and explain the missing artifact behind AI work.

The idea then moved through several revisions:

1. A single-page `.loopthing` viewer for an OpenClaw origin trace.
2. A repo-input demo where pressing Enter on the OpenClaw repo populated the viewer.
3. A more professional repo artifact with `.loopthing` instead of `.json`.
4. A clearer one-line definition centered on "file format."
5. A broad critique that killed the "LoopThing a repo" direction.
6. A package correction: `.loopthing` is a collection of files and artifacts, with a sanitized prompt as the entrypoint and user-input track changes as the lineage.

## True Initial Prompt

The first concrete request was made for the OpenAI Codex hackathon context. It asked for a fast static demo, grounded in OpenClaw:

```text
Build a static, single-page demo viewer for a .loopthing file in 5 minutes.
No build step, no backend, no framework — just index.html + one openclaw.loopthing.json file.
Must open in a browser by minute 6.
```

It defined LoopThing as:

```text
GitHub tracks how code changed. loopThing tracks how an idea arrived.
Every commit in git is a diff between two states of code.
But ideas don't arrive as diffs — they arrive as loops.
```

And it required the first viewer to dramatize:

```text
pruned thought is evidence.
The losing branch still teaches.
```

## Track Changes By User Direction

### 1. Static Viewer

```diff
+ Build for the OpenAI Codex hackathon.
+ Build a static, single-page demo viewer.
+ Use index.html and one .loopthing-shaped data file.
+ Show prompts, critiques, revisions, kills, and kill reasons as a DAG.
+ Make killed branches visually central.
```

Why it mattered: this made the first artifact legible fast for the hackathon, but it still treated `.loopthing` as a data file.

### 2. Repo Input Demo

```diff
+ Add a top-bar input.
+ Let the user hit Enter on the OpenClaw repo and populate the viewer.
```

Why it mattered: it made the demo feel interactive, but it also introduced a misleading idea: that you "LoopThing a repo."

### 3. Professional Repo

```diff
- openclaw.loopthing.json
+ openclaw.loopthing
+ Professional README
+ Explain LoopThing as a file format.
```

Why it mattered: removing `.json` was the first clue that the artifact should not be presented as ordinary JSON.

### 4. One-Liner Refinement

```diff
- A .loopthing is the missing artifact for AI work.
+ A .loopthing is a file format for AI work:
+ a forkable, auditable record of the looping thoughts,
+ branches, killed ideas, and revisions behind how an idea arrived.
```

Why it mattered: "file format" became the center. The product stopped being a visualization and became a portable primitive.

### 5. Open-Ended Critique

```diff
+ Safe portability.
+ Version control for knowledge.
+ Context in a way that is different from summarizing chat.
+ Beautify the trash randomness of ideas.
+ Make session history and ideas readable, skimmable, collaborative.
- You can LoopThing a repo.
+ You LoopThing a session, an exploratory process, or a body of AI work.
+ LoopThing is a collection of artifacts:
+ raw chat, slides, docs, coded prototype, webpage, sanitized prompt.
+ MVP stores sanitized user inputs as the canonical trail.
```

Why it mattered: this killed the "GitHub for thought" shortcut and the GitHub-repo product direction. The repo is not the process. The session is.

### 6. Package Correction

```diff
- .loopthing as one JSON file
+ .loopthing as a package of multiple file types and artifacts
+ Viewer as an OS for browsing the package
+ Core start file is the sanitized prompt
+ Sub-investigation shows the true initial prompt
+ Track all user-input iterations line by line
+ Include produced artifacts like slides and viewer code
```

Why it mattered: this is the current concept. A LoopThing is a portable knowledge package, not a graph file.

## Killed Direction

```diff
- "GitHub for thought"
- "LoopThing a GitHub repo"
```

Kill reason: it is catchy but structurally wrong. GitHub shows code diffs and repo history. LoopThing shows exploratory user-input loops and the artifacts they produced. A repo can be included inside a `.loopthing` package as an artifact, but it is not the unit being tracked.

## Subsequent User Input Summaries

These are the cleaned summaries of the user-authored turns from this chat thread:

```diff
+ Build the hackathon demo quickly: static, no backend, browser-openable.
+ Use OpenClaw as the first source artifact and simulate its missing thought process.
+ Add a repo input so hitting Enter on OpenClaw populates the viewer.
+ Commit the project to the GitHub repo.
+ Make the repo more professional and stop calling the file .json.
+ Refine the title and TLDR until "file format" becomes the core phrase.
+ Simplify the explanation to "looping of thoughts."
+ Treat LoopThing as safe portability and version control for knowledge.
- Do not reduce LoopThing to summarizing chat.
- Do not say you LoopThing a repo.
+ Track exploratory AI work: prompts, branches, killed ideas, revisions, and artifacts.
+ Make `.loopthing` a package of files, not one JSON file.
+ Make the viewer feel like an OS for browsing the package.
+ Start from the sanitized prompt.
+ Include the true initial prompt and line-by-line changes to later user inputs.
+ Explicitly capture this lineage, including the hackathon origin and the killed GitHub repo direction.
```

## Current Winning Direction

```diff
+ A .loopthing is a package for AI work.
+ It starts with the sanitized prompt.
+ It preserves the user-input track changes.
+ It contains the generated artifacts.
+ It can be browsed, forked, audited, and shared.
```
