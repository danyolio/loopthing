# Sanitized Thought Process

The original pressure was a hackathon constraint: build a static demo fast enough to show in a browser.

The first solution was a viewer for an OpenClaw origin trace. It worked as a demo, but the artifact still felt too much like a JSON data file behind a UI.

The second move was repo-oriented: hit Enter on a GitHub repo and generate the LoopThing. That was useful because it made the demo feel interactive, but it pointed at the wrong unit. A repo is usually an output of the thinking loop. It is not the loop.

The third move was the important one: define `.loopthing` as a filetype for exploratory AI work. The file contains user prompts, decisions, killed directions, and artifacts. It is not a transcript and not a summary. It is edited provenance.

The current shape is a rich portable container file:

- user prompts as the spine
- a master prompt to recreate the project
- one-line prompt changes for later user directions
- a journey map that makes the idea easy to explain
- killed branches with reasons
- generated explainers that did not exist in the chat
- artifacts that prove the loop produced something real

This is why the file makes the creator look good. It shows judgment. It does not expose every messy token. It generates the problem statement, context, visuals, drafts, and artifacts that help someone else understand the intelligence of the work.
