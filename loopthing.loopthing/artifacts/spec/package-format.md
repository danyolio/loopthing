# LoopThing Package Format

This version treats `.loopthing` as a package directory, not a JSON file.

This example began as an OpenAI Codex hackathon demo and briefly tried a GitHub-repo input direction. That direction is preserved as a killed branch: a repo may be one artifact in the package, but the `.loopthing` tracks the exploratory session that produced it.

## Required

- `manifest.loop`: package metadata and entrypoint
- `START.md`: sanitized prompt for the project
- `investigations/`: prompt history, track changes, killed directions, reasons
- `artifacts/`: slides, docs, code, prototypes, webpages, references

## Optional

- `graph/`: machine-readable thought graph for visual viewers
- `raw/`: private or redacted source material
- `exports/`: rendered PDFs, slides, screenshots, or static builds

## Canonical Spine

The canonical spine is sanitized user input.

AI responses can be included as supporting material, but they are not the primary proof. The package should show what the human asked, how the direction changed, what got killed, and which artifacts shipped.

## Why A Package

A single JSON file is good for machines. It is bad as the whole product.

LoopThing needs to carry multiple artifact types:

- markdown prompts
- track-change investigations
- slides
- code
- prototypes
- graph data
- exports

The `.loopthing` extension marks the whole bundle as one portable thinking artifact.
