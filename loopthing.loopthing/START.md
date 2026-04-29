# The Missing Artifact

A `.loopthing` is a file format for AI work: a forkable, auditable collection of the looping thoughts, branches, killed ideas, revisions, and artifacts behind how an idea arrived.

## Sanitized Project Prompt

Create the LoopThing of LoopThing itself.

The project began as an OpenAI Codex hackathon demo: ship something static, fast, and browser-openable that could explain a new `.loopthing` artifact under time pressure. The first implementation used OpenClaw as the example source and treated `.loopthing` like a single viewer data file.

That was useful scaffolding, but it was not the final idea. Through this chat thread, the concept moved through several revisions, including a repo-oriented version where you could "LoopThing a GitHub repo." That branch was killed. A repo is not the thinking process; it is only one possible output of the process.

The artifact should not be a single JSON file. It should be a portable package: a folder-like `.loopthing` bundle that contains the cleaned-up prompt trail, prompt-level track changes, killed directions, reasons, and the actual artifacts produced along the way.

The first thing a reader sees should be the sanitized prompt: the best, clearest version of the idea after the whole session. From there, the reader can open sub-investigations:

- the true initial prompt
- the OpenAI Codex hackathon origin
- the killed GitHub repo interpretation
- line-by-line user-input track changes
- the thought DAG
- the presentation slide
- the viewer code artifact
- the package format notes

The viewer should feel like a tiny operating system for the package. You browse the `.loopthing` bundle as files, not as a single blob. The core experience is not "summarize my chat." It is "make my session history and exploratory work readable, skimmable, forkable, and safe to share."

## Final Shape

LoopThing turns the mess of exploratory AI work into a portable artifact bundle.

The output is no longer the only artifact. The thinking ships too.
