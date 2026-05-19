# LoopThing DESIGN.md

## Product Feeling

LoopThing should feel like opening a well-made reasoning dossier: quiet, exact, inspectable, and worth forwarding.

## Palette

- Paper: `#F6F2E8`
- Ink: `#171713`
- Muted ink: `#5D5A51`
- Hairline: `#D8D0C0`
- Blue prompt: `#2D6CDF`
- Amber critique: `#B7791F`
- Green survivor: `#188A5A`
- Red killed branch: `#B93830`
- Purple synthesis: `#6A4BC3`

Dark mode:

- Charcoal: `#11110F`
- Panel: `#181713`
- Ink: `#F4EFE2`
- Muted ink: `#AEA696`
- Hairline: `#3B362D`

## Typography

Use one strong system stack:

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Use monospace only for filenames, ids, timestamps, exact prompts, and code:

```css
font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

## Layout

- Lead with the artifact, not marketing copy.
- Use large whitespace and hairline rules.
- Make the `.loopthing` file object visible.
- Make lineage visual: boxes, arrows, kill marks, annotations.
- Keep panels shallow. No nested dashboards.

## Components

- File object: filename, size, MIME marker, checksum-like id.
- Reasoning card: section title, exact quote, why it mattered.
- Kill branch: dimmed card, strikethrough, red edge, explicit reason.
- Metadata pills: message count, sources, topics, artifact families.
- Journey map: whiteboard-style boxes and arrows, but precise labels.

## Motion

Almost none. One motion is allowed: a killed branch draws its strikethrough and stays visible.

## Screenshots

Screenshots should show distinct aha moments:

- raw chat turns into compressed artifact
- critical messages and framing diffs
- discarded branch with reason
- shareable `.loopthing` file object
- MRR/business artifact when explaining the company

## Anti-Patterns

- no gradient hero
- no generic network graph as the main idea
- no purple AI glow
- no "dashboard of cards"
- no fake metrics without source metadata
- no hiding uncertainty

