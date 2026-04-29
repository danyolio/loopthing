# Master Prompt

Build the LoopThing of LoopThing itself.

A `.loopthing` is a portable exploration tree for AI work. It captures prompts, follow-ups, branches, constraints, self-critiques, killed paths with reasons, generated explainers, media, slides, prototypes, and code as one shareable artifact.

The product should communicate a simple claim:

```text
The final output is not the only artifact.
The thinking ships too.
```

## Required Story

This project began as an OpenAI Codex hackathon idea. The earliest version imagined "loopthinging" Karpathy's LLMWiki gist by simulating four origin agents: compression, pedagogy, tooling, and canon. The next version introduced Ralph Loop, constraint vectors, and a demo question: "What could documentation be when agents read it?"

The shipped static viewer briefly used OpenClaw as a fast source artifact. Later feedback killed the "LoopThing a GitHub repo" branch because a repo is usually an output, not the thought process.

The current artifact is self-referential: it is the LoopThing of LoopThing.

## Product Vocabulary

- Ralph Loop: generate -> critique -> regenerate -> diverge -> kill -> loop again.
- EXPLORE: agents fan out under different constraint vectors.
- JUDGE: the human kills weak branches with written reasons.
- DEEPEN: survivors spawn children that inherit the parent and avoid killed failure modes.
- SEAL: the exploration becomes a portable `.loopthing` file.

## Container Contents

Use simple, obvious sections:

- `Prompts`: master prompt, true initial prompt, follow-ups, and one-line change log.
- `Thinking`: process narrative, journey map, and discarded ideas.
- `Drafts`: rough framings that show the idea getting better.
- `Generated Explainers`: problem statement, solution overview, how it works, relevant context, and share brief.
- `Artifacts/Media`: generated visual explainers and diagrams.
- `Artifacts`: screenshots, docs, slides, prototypes, code, and one-liner.

## Design Requirement

Do not make the file feel like a pile of markdown. It should feel like opening a rich PDF for AI work: visual, browsable, skimmable, and worth sending to a smart friend or coworker.

## One-Liner

A `.loopthing` is a portable exploration tree for AI work: prompts, branches, critiques, killed paths, generated explainers, media, and artifacts in one forkable file.
