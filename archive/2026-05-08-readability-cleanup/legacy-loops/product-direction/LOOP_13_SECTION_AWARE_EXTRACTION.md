# Loop 13: Section-Aware Extraction Quality

## Prompt

The user asked to run LoopThing on the folder. The product worked, but the output showed a quality bug: discarded branches and risks were being pulled from random keyword matches instead of explicit reasoning sections.

## Critique

The v0 product crossed the input-output line, but its extraction was too literal. It treated markdown documents as flat messages, so headings like `Discarded Ideas`, `Killed Paths`, `Where The Explanation Might Be Wrong`, and `Next Action` were not privileged enough.

## Regeneration

Improve the CLI with markdown section awareness:

- parse headings and section bodies
- prefer explicit `Intent` and `Problem` sections
- extract discarded branches from `Discarded`, `Killed Paths`, and `What Not To Build`
- extract risks from `Risks`, `Where The Explanation Might Be Wrong`, `Known Limits`, and `Kill Criteria`
- extract asks and next action from their own sections
- add a project-doc fixture that tests killed paths, risks, next action, and asks

## Built

- `bin/loopthing.mjs`: section-aware extraction helpers
- `test/fixtures/project-docs.md`: regression fixture
- `test/product-smoke.mjs`: quality assertions
- `tmp/loopthing-folder-run/reasoning.md`: improved project-folder output

## Killed Branch

### Keyword-Only Extraction

Killed because it produces plausible-looking but dumb artifacts. The product has to respect explicit reasoning structure before it can be trusted.

## Next Loop

Add real export fixtures:

- ChatGPT export JSON
- Claude markdown/text export
- Codex session transcript

Then score whether the generated `reasoning.md` beats generic summary for recipient comprehension.

