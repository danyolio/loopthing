# Codex Project Chat Loop

The latest product loop made LoopThing aware of real ChatGPT/Codex project shape.

## Problem

A real AI project is not only a folder of markdown files. It is a mix of live user directions, assistant work, prompts, generated explainers, docs, code, and metadata.

If the compressor treats everything as one flat pile, long generated docs can drown out the user turns that actually changed the project.

## Change

The CLI now tracks source kind and renders source shape:

- chat transcript
- prompt
- thinking
- generated explainer
- company loop
- docs
- metadata

It also renders recent user directions and reserves critical-message slots for real chat turns when a transcript is present.

## Run

Two artifacts were generated:

- `tmp/current-chat.loopthing`
- `tmp/loopthing-folder.loopthing`

## Result

The combined run now shows both the project folder and the living chat directions that moved the work: build the product, simplify the CLI, run it on the folder, and improve the compressor again.
