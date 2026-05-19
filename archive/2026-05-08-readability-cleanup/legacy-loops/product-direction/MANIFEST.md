# Ralph Loop Manifest: Strongest Product Direction

## Executive Summary

The strongest direction is **compression-first handoff**.

LoopThing should begin as a tool that turns messy AI conversations into a compressed reasoning artifact a recipient can read in under five minutes. The product is not the viewer, not the `.loopthing` container, not memory, and not a generic archive. The product is compression quality: does it find the gold, preserve the move, and help someone else land where the creator landed?

## Pinned Direction

### Compression-First Handoff

**Thesis:** LoopThing is a compressed reasoning artifact for multiplayer AI work.

The wedge is the handoff moment: "I need another person to understand where this thinking landed without reading the whole transcript." This is narrower and stronger than "store the thinking" because it has a falsifiable test.

**The test:** Give a recipient a `.loopthing` generated from a real conversation. Can they understand the creator's intent, discarded branches, surviving claim, risks, and next action in under five minutes?

**Best Artifact:** A CLI that accepts one or more chat exports/transcripts and produces:

- `reasoning.md`: the compressed loopthing artifact
- `source-metadata.json`: message counts, tools, timestamps, topics
- optional `yourproject.loopthing`: portable container with supporting artifacts

**Why this wins:** It starts where the pain is already observable: people copy-paste old chats into new chats because they know there is gold in there but cannot locate it.

## Branch Verdicts

| Branch | Verdict | Reason |
| --- | --- | --- |
| Compression-first handoff | Pinned | Has the clearest job, falsifiable test, and current behavioral evidence. |
| Semantic decision layer | Survivor | Strong category frame, but too abstract until compression works. |
| Personal retrieval memory | Killed for v1 | Lab memory will compete directly and user behavior is hard to measure. |
| Rich viewer/container | Killed as center | Useful support surface, but premature before compression quality is proven. |
| RL/training-data corpus | Killed as wedge | Possible downstream asset, but weak initial buyer and slow motion. |

## Regenerated Product Shape

Start with the smallest product that can prove the thesis:

```text
loopthing compress ./transcripts/*.md --mode=handoff --out ./loopthing-test/
```

Output:

```text
loopthing-test/
  reasoning.md
  source-metadata.json
  compression-score.md
  variants/
    generic.md
    structured.md
    dual-render.md
```

The sealed `.loopthing` container comes after the compression test works. Until then, container design is a distraction.

## Killed Paths

### Memory But Better

Killed because OpenAI, Anthropic, and other labs can ship single-player memory with deeper integration. LoopThing needs to stand where lab incentives are weaker: cross-tool, multiplayer handoff.

### Viewer-First Product

Killed because a beautiful viewer can make weak compression look temporarily impressive. If the compressed artifact does not find the gold, the viewer is theater.

### Format Spec First

Killed because a format is only interesting once the artifact is useful. A spec before compression quality creates busywork and false progress.

### Repo Explainer

Killed because a repo is usually an output of the reasoning process, not the reasoning itself. Working backward from a repo is demo-friendly but not the true wedge.

### RL Data Play

Killed as the primary wedge because the customer set is tiny and labs already have richer internal signal. It may become valuable only if a real corpus accretes.

## Evidence

- `loopthing-source/Thinking/Stress Test.md` names the current survivor: "a compressed reasoning artifact" with handoff as the initial use case.
- `loopthing-source/Generated Explainers/Solution Overview.md` says the product is compression quality: "did it find the gold?"
- `README.md` now leads with compressed reasoning and a five-minute recipient test.
- `loopthing-source/Thinking/Discarded Ideas.md` already killed raw transcript, final-output-only, repo input, and markdown dump directions.

## Final Claim

LoopThing should be built as a compression engine first, a portable format second, and a viewer third.

The strongest product direction is to prove that compressed reasoning handoff is valuable before building the broader semantic decision layer.

## Continuous Loop Update

Loop 02 attacked the pinned direction and found five live risks: handoff may be rare, compression may be unreliable, recipients may only want conclusions, the wedge may be a workflow rather than a product, and the category language may be premature.

Loop 03 regenerated the direction into a smaller product: a compression test harness.

Loop 04 sealed the test protocol. The next real loop must run on 20 real conversations and update or kill the thesis based on results.

Loop 05 narrowed the first persona to AI-native technical founders and product builders.

Loop 06 pinned the artifact contract: `reasoning.md` is the product nucleus, and `.loopthing` is the seal step.

Loop 07 pinned the first product surface: a local CLI compression harness.

Loop 08 pinned distribution: a private compression challenge before public category narrative.

Loop 09 sealed the 30-day plan. The product should now move from interpretation to empirical proof.

Loop 10 added the company layer: brand, business model, MRR ladder, life-design constraints, and a Ralph-style multi-area operating workspace. The new pinned business direction is a high-trust reasoning company: compression-first product, artifact-grade brand, product-led revenue, and a small-team operating model.

Loop 11 crossed from artifact/demo into product. `bin/loopthing.mjs` now implements a local CLI with `compress`, `score`, `compare`, and `seal`. It reads real transcript files and produces the product nucleus: `reasoning.md` and `source-metadata.json`.

Loop 12 simplified the happy path. `loopthing create` now compresses, scores, and seals in one command. The four-command flow remains for debugging, not normal use. This loop also advanced marketing, finance, life-design, business validation, and design-reference tasks.

Loop 13 improved product quality after running LoopThing on the project folder. The CLI now prefers explicit markdown sections for intent, problem, discarded branches, risks, asks, and next action instead of relying only on keyword matches.

Loop 14 made the product Codex-project aware. The compressor now tracks source shape, renders recent user directions, and reserves critical-message slots for actual chat turns when chat transcripts are present.

Loop 15 pressure-tested the product against the user's confusion: too many folders, too much evidence, not enough obvious continuation value. It pinned `agent-handoff.md` as the most important output: paste-ready context for the next chat, agent session, collaborator, project, or future self.
