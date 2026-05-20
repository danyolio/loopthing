# Run LoopThing

## One Command

Run LoopThing on the current project folder:

```bash
node bin/loopthing.mjs create . \
  --out demo/loopthing-clean.loopthing \
  --run-dir demo/current-run \
  --title "LoopThing Clean Project Handoff"
```

The project-level run ignores `archive/`, `tmp/`, `runs/`, nested generated `loopthing/` output, generated `current-run/` output, and `test/` fixtures. The curated current source material lives in `source/current-project-chat.md`.

## What Comes Out

```text
demo/
  current-run/
    START_HERE.md
    brief.md
    agent-guide.md
    agent-handoff.md
    reasoning.md
    source-audit.md
    source-metadata.json
    compression-score.md
    scores.jsonl
    manifest.loop
    prompts/compression-prompt.md
    variants/generic.md
  loopthing-clean.loopthing
```

## How To Use The Output

Read `demo/current-run/START_HERE.md` first.

Send `demo/current-run/brief.md` to a friend, collaborator, or future self when they need the clean takeaway without the audit trail.

Ask an AI agent with filesystem access to read `demo/current-run/agent-guide.md` first. It explains source confidence, exact Codex / Claude Code roles, and what not to treat as user intent.

Paste `demo/current-run/agent-handoff.md` into a fresh chat or agent session when you want the next session to inherit the work.

Read `demo/current-run/reasoning.md` when you want the fuller artifact.

Open `demo/current-run/source-audit.md` when you want the receipt of exactly which files and local AI sessions were included.

## Use Structured Codex Sessions

When the work happened in Codex, prefer the local rollout JSONL over pasted text. The roles are exact instead of inferred.

```bash
node bin/loopthing.mjs sessions scan
node bin/loopthing.mjs sessions inspect <session-id>
node bin/loopthing.mjs sessions normalize <session-id> --out tmp/messages.jsonl
node bin/loopthing.mjs create-session <session-id> --out selected-session.loopthing
```

Use `sessions scan --all` to see sessions outside the current workspace. Use `create-session` with multiple session ids when you deliberately want to include related conversations from different dates.

## Find Related Claude Code Conversations

When related work happened in Claude Code, scan the local Claude history first, then explicitly opt selected JSONL files into the run.

```bash
node bin/loopthing.mjs claude scan "pricing decision customer research"
node bin/loopthing.mjs claude scan --like tmp/pasted-chat.md
node bin/loopthing.mjs claude inspect ~/.claude/projects/<project>/<session>.jsonl
```

`claude scan` searches `~/.claude/projects` by default. It prints scored JSONL paths and short first-user excerpts so you can choose the conversations that belong in the loop. Subagent conversations are skipped unless you pass `--include-subagents`.

Then include selected Claude paths directly:

```bash
node bin/loopthing.mjs create \
  tmp/pasted-chat.md \
  ~/.claude/projects/<project>/<session>.jsonl \
  --out selected-context.loopthing
```

## Score Meaning

`compression-score.md` is a structural and readability smoke test. It checks that required pieces exist and catches obvious jank:

- required sections
- current thesis
- current wedge
- key user messages
- decision shifts
- discarded branches
- risks
- next action
- mangled Markdown snippets
- generic boilerplate in the handoff
- brief
- agent guide
- source audit
- metadata

A perfect score does not mean the reasoning is perfect. It means the run produced the expected artifact shape and avoided the worst rendering failures.
