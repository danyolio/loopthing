# Loop 14: Codex Project Chat Awareness

## Prompt

The user said: "look through this whole chat. this is a real chatgpt /codex project. ralph loop improve the product again and run it."

## Critique

LoopThing had improved project-folder compression, but a real Codex project is not just a folder of markdown. It is a mixed corpus:

- live user directions
- assistant/generated outputs
- prompts
- Ralph loop artifacts
- generated explainers
- code
- docs
- metadata

The product needed to preserve that source shape. Without it, long generated documents can drown out the actual user turns that moved the work.

## Regeneration

The CLI now:

- classifies source kinds
- writes `source_kind_counts` into `source-metadata.json`
- renders a `Source shape` section
- renders `Recent user directions`
- reserves critical-message slots for chat user directions when transcripts are present
- includes a Codex-project chat fixture based on this conversation

## Built

- `bin/loopthing.mjs`
- `test/fixtures/codex-project-chat.md`
- `test/product-smoke.mjs`
- `tmp/current-chat.loopthing`
- `tmp/loopthing-folder.loopthing`

## Killed Branch

### Folder-Only Compression

Killed because real AI projects are not just files. They are chat plus generated files plus decisions. The source shape needs to be visible in the artifact.

## Next Loop

Add importers for real exported ChatGPT, Claude, and Codex formats, then run the five-minute handoff test with actual recipients.

