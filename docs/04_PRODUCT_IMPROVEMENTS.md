# Product Improvements

These are the next product loops worth running.

## 1. Add Model-Backed Compression

The current CLI is deterministic and local. It now builds a project model before rendering, which is much better than chopped excerpts, but it still cannot deeply reason across messy long-context source material.

Next loop: add a model-backed compression mode and compare it against the deterministic output.

## 2. Add Recipient Tests

The product should be judged by handoff quality.

Next loop: give `agent-handoff.md` to a fresh chat or collaborator and ask whether they can continue the work without reading the source.

## 3. Expand Project Modeling

The current demo should stay recursive: LoopThing compressing the evolution of LoopThing itself. That means the source material, generated run, README, and static page should all describe the same project history and product direction.

Next loop: improve the generic project model enough to handle startups, code projects, research projects, and design projects without hard-written domain adapters or unrelated fixture stories.

## 4. Support Project Bundles

The sealed `.loopthing` should become a richer container over time: reasoning, metadata, slides, screenshots, prototypes, docs, and code.

Next loop: define a minimal bundle manifest for generated artifact families without turning the root folder back into clutter.
