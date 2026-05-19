# Product Quality Loop

The latest product loop improved extraction quality.

## Problem

Running LoopThing on the project folder worked, but the first output exposed a real bug: killed paths and risks were sometimes pulled from random keyword matches instead of explicit reasoning sections.

## Change

The CLI now parses markdown sections and prefers structured headings:

- `Intent`
- `Problem`
- `Discarded branches`
- `Killed Paths`
- `Where The Explanation Might Be Wrong`
- `Known Limits`
- `Next Action`
- `Asks`

## Result

The project-folder output now shows cleaner discarded branches like:

- Raw Chat Export
- Final Output Only
- LoopThing A GitHub Repo
- Folder Masquerading As Filetype
- Markdown Dump
- Preserve Without Generating

Each keeps a reason.

## Next Product Loop

Add real ChatGPT, Claude, and Codex export fixtures, then score whether LoopThing beats generic summary for recipient comprehension.
