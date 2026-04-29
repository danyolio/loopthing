# User Input Track Changes

This investigation shows how the idea moved from the true initial prompt to the current LoopThing package concept.

The spine is user input only. AI responses are not treated as the canonical record; they are supporting material. The proof is the sequence of human directions, edits, constraints, and reversals.

## True Initial Prompt

The first concrete request was:

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
+ Build a static, single-page demo viewer.
+ Use index.html and one .loopthing-shaped data file.
+ Show prompts, critiques, revisions, kills, and kill reasons as a DAG.
+ Make killed branches visually central.
```

Why it mattered: this made the first artifact legible fast, but it still treated `.loopthing` as a data file.

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

Why it mattered: this killed the "GitHub for thought" shortcut. The repo is not the process. The session is.

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
```

Kill reason: it is catchy but structurally wrong. GitHub shows code diffs and repo history. LoopThing shows exploratory user-input loops and the artifacts they produced.

## Current Winning Direction

```diff
+ A .loopthing is a package for AI work.
+ It starts with the sanitized prompt.
+ It preserves the user-input track changes.
+ It contains the generated artifacts.
+ It can be browsed, forked, audited, and shared.
```
