# New Prompt: Build the LoopThing of LoopThing Itself

Build a static, single-page demo for `loopthing.loopthing`: a `.loopthing` container file that explains LoopThing by showing the messy thought loop that created LoopThing.

The lineage must be explicit: the idea began as an OpenAI Codex hackathon demo, first used OpenClaw as a source artifact, briefly became a GitHub-repo input concept, and then killed that direction. The package should preserve that evolution from this exact chat thread as cleaned user-input summaries.

## Core Definition

A `.loopthing` is a rich portable file for AI work: prompts, follow-ups, discarded ideas, drafts, generated explainers, screenshots, docs, slides, prototypes, and code that show how an idea arrived.

Do not frame this as "GitHub for repos." GitHub tracks code changes. LoopThing turns exploratory AI sessions into readable, portable knowledge artifacts. It is closer to version control for thinking, but the unit is not a repo or a commit. The unit is a thinking loop.

## What The Demo Must Communicate

Modern AI work starts in chat. That chat becomes the primitive: prompts, follow-ups, discarded ideas, rough drafts, screenshots, docs, slides, prototypes, and code. Today those loops either stay as unreadable session history or get compressed into a final artifact where the useful process disappears.

LoopThing beautifies the trash randomness of idea work into something skimmable. It is not "summarize my chat." It is a container format that turns session mess into a sequence of generated artifacts and explainers:

- a master prompt
- initial prompt
- follow-ups
- one-line prompt change log
- critiques
- branches
- discarded ideas
- reasons those ideas were killed
- rough drafts
- problem statements
- solution explainers
- relevant context
- screenshots
- docs
- slides
- prototypes
- code

The MVP stores sanitized user inputs and artifact references as the canonical trail. Raw AI responses can exist as supporting material, but they are not the primary proof. The primary proof is the loop: what the human asked, how the idea changed, what was killed, and what shipped.

## Demo Artifact

Create `loopthing.loopthing` as the self-referential rich file. Keep `loopthing-source/` as the unpacked editing source. It should contain prompts, follow-ups, discarded ideas, drafts, generated explainers, screenshots, docs, slides, prototypes, code, and container-format notes.

The true initial prompt investigation must name the OpenAI Codex hackathon context and show the subsequent user-authored revisions, especially the abandoned "LoopThing a GitHub repo" branch.

The journey map should show the idea getting sharper:

- Hackathon spark.
- OpenClaw origin trace.
- GitHub repo branch.
- Killed repo direction.
- File format shift.
- Container shift.
- Generated explainers.
- Shareable proof.

Each lens should include a killed branch with a substantive reason. The strongest killed branch is: "Make it GitHub for thought." Kill it because it is memorable but misleading: code diffs are not the same as thought loops, and repos show outputs rather than the prompt process.

## Product Shape

Keep the viewer static: `index.html` plus the `loopthing.loopthing` container and `loopthing-source/` source tree. No backend, framework, build step, login, settings, or generator.

The viewer should behave like a tiny OS for the rich file. The top input should say `container`, not `repo`, because you cannot LoopThing a repo directly. You LoopThing a messy AI session or exploratory process and export it as a portable artifact.

The UI should make the file feel like a real artifact:

- filename: `loopthing.loopthing`
- title: `The Missing Artifact`
- tagline: `the output is no longer the only artifact`
- visible kill reasons
- visible artifact files
- clear note that this is sanitized, not raw chat

## Tone

Plain, sharp, and simple. The one-liner should be understandable in one breath:

> A `.loopthing` is a rich portable file for AI work: prompts, follow-ups, discarded ideas, drafts, generated explainers, screenshots, docs, slides, prototypes, and code that show how an idea arrived.
