"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Moon,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LoopInsight, ThinkingItem } from "@/lib/domain";
import { diffTextByLine } from "@/lib/text-diff";

type VersionHistoryProps = {
  versions: ThinkingItem[];
  insights: LoopInsight[];
  currentCheckpointId: string | null;
  editable: boolean;
  onRestore: (version: ThinkingItem) => void;
};

type ChangeAttribution = {
  directives: string[];
  independent: string[];
  preserved: string[];
};

function textOf(item: ThinkingItem | undefined, ...keys: string[]) {
  if (!item) return "";
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function stringsOf(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function attributionOf(insight: LoopInsight | undefined): ChangeAttribution {
  const value = insight?.change_attribution;
  if (!value || typeof value !== "object") {
    return {
      directives: [],
      independent: stringsOf(insight?.what_changed),
      preserved: [],
    };
  }
  const attribution = value as Record<string, unknown>;
  return {
    directives: stringsOf(attribution.directives),
    independent: stringsOf(attribution.independent),
    preserved: stringsOf(attribution.preserved),
  };
}

function RestoreButton({
  version,
  editable,
  onRestore,
}: {
  version: ThinkingItem;
  editable: boolean;
  onRestore: (version: ThinkingItem) => void;
}) {
  if (!editable) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 mt-2"
      onClick={() => onRestore(version)}
    >
      <RotateCcw />
      Restore as a new version
    </Button>
  );
}

function DiffView({ before, after }: { before: string; after: string }) {
  const diff = diffTextByLine(before, after);
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <GitCompareArrows className="size-3.5" />
          Document diff
        </p>
        <p className="font-mono text-[10px]">
          <span className="text-emerald-700">+{diff.added}</span>{" "}
          <span className="text-red-700">−{diff.removed}</span> lines
        </p>
      </div>
      <div className="max-h-96 overflow-auto bg-background py-1 font-mono text-[11px] leading-5">
        {diff.lines.map((line, index) => (
          <div
            key={`${line.kind}-${line.beforeLine}-${line.afterLine}-${index}`}
            className={
              line.kind === "added"
                ? "grid grid-cols-[2.5rem_2.5rem_1rem_1fr] bg-emerald-50 text-emerald-950"
                : line.kind === "removed"
                  ? "grid grid-cols-[2.5rem_2.5rem_1rem_1fr] bg-red-50 text-red-950"
                  : "grid grid-cols-[2.5rem_2.5rem_1rem_1fr] text-muted-foreground"
            }
          >
            <span className="select-none border-r px-1 text-right text-black/30">
              {line.beforeLine ?? ""}
            </span>
            <span className="select-none border-r px-1 text-right text-black/30">
              {line.afterLine ?? ""}
            </span>
            <span className="select-none text-center">
              {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}
            </span>
            <span className="whitespace-pre-wrap break-words pr-3">
              {line.text || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttributionList({
  title,
  description,
  items,
  icon: Icon,
}: {
  title: string;
  description: string;
  items: string[];
  icon: typeof UserRound;
}) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-semibold">
        <Icon className="size-3.5 text-[var(--signal-strong)]" />
        {title}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
        {description}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-5">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-[var(--signal-strong)]" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DreamChangeSet({
  version,
  base,
  insight,
  currentCheckpointId,
  editable,
  onRestore,
}: {
  version: ThinkingItem;
  base: ThinkingItem;
  insight: LoopInsight | undefined;
  currentCheckpointId: string | null;
  editable: boolean;
  onRestore: (version: ThinkingItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const attribution = attributionOf(insight);
  const isCurrent = textOf(version, "checkpoint_id") === currentCheckpointId;

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--signal-strong)]/25">
      <div className="bg-[var(--signal)]/[0.055] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge className="bg-[var(--signal-strong)]">
              <Moon className="size-3" />
              Dream change set
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(textOf(version, "created_at")), {
                addSuffix: true,
              })}
            </p>
          </div>
          {isCurrent && <Badge variant="outline">Current</Badge>}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Before Dream
            </p>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {textOf(base, "plain_text") || "Preserved document state"}
            </p>
            <RestoreButton
              version={base}
              editable={editable}
              onRestore={onRestore}
            />
          </div>
          <div className="hidden items-center justify-center sm:flex">
            <ArrowRight className="size-4 text-[var(--signal-strong)]" />
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--signal-strong)]">
              After Dream
            </p>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {textOf(version, "plain_text") || "Preserved document state"}
            </p>
            <RestoreButton
              version={version}
              editable={editable}
              onRestore={onRestore}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full bg-background"
          onClick={() => setExpanded((current) => !current)}
        >
          <GitCompareArrows />
          {expanded ? "Hide changes" : "Review overnight changes"}
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t p-4">
          <DiffView
            before={textOf(base, "plain_text")}
            after={textOf(version, "plain_text")}
          />

          <div className="grid gap-3">
            <AttributionList
              title="Directed by you"
              description="Explicit feedback, notes, and decisions the Dream followed."
              items={attribution.directives}
              icon={UserRound}
            />
            <AttributionList
              title="Developed by Loopthing"
              description="Editorial and analytical choices made without a direct instruction."
              items={attribution.independent}
              icon={Bot}
            />
            <AttributionList
              title="Held steady"
              description="Important material the Dream deliberately preserved."
              items={attribution.preserved}
              icon={Check}
            />
          </div>

          {insight?.next_action && (
            <div className="rounded-xl bg-[var(--ink)] p-3 text-[var(--paper)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">
                What comes next
              </p>
              <p className="mt-1 text-xs leading-5 text-white/80">
                {insight.next_action}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function StandardVersion({
  version,
  isCurrent,
  editable,
  onRestore,
}: {
  version: ThinkingItem;
  isCurrent: boolean;
  editable: boolean;
  onRestore: (version: ThinkingItem) => void;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">
          {textOf(version, "label", "reason").replaceAll("_", " ") || "Version"}
        </Badge>
        <div className="flex items-center gap-2">
          {isCurrent && <Badge variant="outline">Current</Badge>}
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(textOf(version, "created_at")), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
      {textOf(version, "rationale") && (
        <p className="mt-3 text-xs font-medium leading-5">
          {textOf(version, "rationale")}
        </p>
      )}
      <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
        {textOf(version, "plain_text") || "Preserved document state"}
      </p>
      <RestoreButton version={version} editable={editable} onRestore={onRestore} />
    </div>
  );
}

export function VersionHistory({
  versions,
  insights,
  currentCheckpointId,
  editable,
  onRestore,
}: VersionHistoryProps) {
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const preDreamByRun = new Map(
    versions
      .filter((version) => textOf(version, "source") === "pre_dream")
      .map((version) => [textOf(version, "loop_run_id"), version]),
  );
  const insightById = new Map(insights.map((insight) => [insight.id, insight]));
  const insightByRun = new Map(
    insights.map((insight) => [insight.loop_run_id, insight]),
  );
  const dreamVersions = versions.filter(
    (version) => textOf(version, "source") === "dream",
  );
  const pairedBaseIds = new Set<string>();

  const changeSets = dreamVersions.flatMap((version) => {
    const baseId = textOf(version, "base_version_id");
    const base =
      versionById.get(baseId) ??
      preDreamByRun.get(textOf(version, "loop_run_id"));
    if (!base) return [];
    pairedBaseIds.add(base.id);
    return [
      {
        version,
        base,
        insight:
          insightById.get(textOf(version, "insight_id")) ??
          insightByRun.get(textOf(version, "loop_run_id")),
      },
    ];
  });

  const standardVersions = versions.filter(
    (version) =>
      textOf(version, "source") !== "dream" && !pairedBaseIds.has(version.id),
  );

  if (!versions.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm font-semibold">No versions yet</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Manual checkpoints, accepted proposals, and Dream change sets will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {changeSets.map(({ version, base, insight }) => (
        <DreamChangeSet
          key={version.id}
          version={version}
          base={base}
          insight={insight}
          currentCheckpointId={currentCheckpointId}
          editable={editable}
          onRestore={onRestore}
        />
      ))}

      {standardVersions.length > 0 && (
        <section className="space-y-3">
          {changeSets.length > 0 && (
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Other versions
            </p>
          )}
          {standardVersions.map((version) => (
            <StandardVersion
              key={version.id}
              version={version}
              isCurrent={
                textOf(version, "checkpoint_id") === currentCheckpointId
              }
              editable={editable}
              onRestore={onRestore}
            />
          ))}
        </section>
      )}
    </div>
  );
}
