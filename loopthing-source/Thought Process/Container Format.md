# LoopThing Container Format

A `.loopthing` is a single portable container file.

For this demo, the GitHub repo also includes `loopthing-source/`, the unpacked editing source used to build the container. That folder is not the artifact. It is the source tree, similar to how an app repo can build a `.app`, `.epub`, or `.pptx`.

This example began as an OpenAI Codex hackathon demo and briefly tried a GitHub-repo input direction. That direction is preserved as a killed branch: a repo may be one artifact in the package, but the `.loopthing` tracks the exploratory session that produced it.

## Required

- `mimetype`: `application/vnd.loopthing+zip`
- `manifest.loop`: metadata and entrypoint
- `User Prompts/`: master prompt, raw user prompts, and one-line change log
- `Thought Process/`: sanitized process, journey map, killed directions, format notes
- `Artifacts/`: slides, docs, code, prototypes, webpages, references

## Optional

- `Exports/`: rendered PDFs, screenshots, or static builds
- `Private/`: local-only source material that should not be shared
- `Machine Data/`: optional structured data for advanced viewers

## Canonical Spine

The canonical spine is `User Prompts`.

AI responses can be included as supporting material, but they are not the primary proof. The container should show what the human asked, how the direction changed, what got killed, and which artifacts shipped.

## Why A Container

A single JSON file is good for machines. A folder is good while editing. Neither feels like the artifact you hand to another person.

The `.loopthing` container carries multiple artifact types:

- markdown prompts
- prompt change logs
- journey maps
- killed directions
- slides
- code
- prototypes
- exports

The `.loopthing` extension marks the whole container as one portable thinking artifact.
