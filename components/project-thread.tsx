"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  ArrowDown,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  FileDiff,
  FileText,
  GitBranch,
  Lightbulb,
  Link2,
  MessageSquare,
  Moon,
  Network,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasoningGraph, type GraphEdge, type GraphNode } from "@/components/reasoning-graph";
import styles from "@/components/project-thread.module.css";
import type {
  CritiqueReview,
  DreamChangeReview,
  LoopInsight,
  LoopRun,
  Project,
  ReasoningEdge,
  ReasoningNode,
  ThinkingItem,
} from "@/lib/domain";
import {
  deriveProjectThread,
  type ThreadChangeCount,
  type ThreadCycle,
  type ThreadFrontier,
  type ThreadInput,
  type ThreadInputKind,
} from "@/lib/project-thread";

type ContextTarget =
  | "loops"
  | "critique"
  | "sources"
  | "questions"
  | "decisions"
  | "comments"
  | "branches"
  | "history";

type ThreadSelection =
  | {
      type: "version";
      title: string;
      version?: ThinkingItem;
      note: string;
      changes?: ThreadChangeCount;
    }
  | { type: "inputs"; title: string; inputs: ThreadInput[]; changes: ThreadChangeCount }
  | { type: "dream"; cycle: ThreadCycle }
  | { type: "review"; cycle: ThreadCycle }
  | { type: "frontier"; frontier: ThreadFrontier };

// Time runs downward. Columns describe authorship; grouped bands describe cycles.
const canvasWidth = 1040;
const nodeWidth = 236;
const humanX = 52;
const workX = 402;
const dreamX = 752;
const humanWidth = nodeWidth;
const workWidth = nodeWidth;
const dreamWidth = nodeWidth;
const firstVersionY = 102;
const standardNodeHeight = 104;
const contributionHeight = 108;
const dreamNodeHeight = 144;
const cycleStartY = 232;
const contributionOffset = 54;
const beforeDreamOffset = 190;
const dreamOffset = 326;
const outputOffset = 492;
const cycleStep = 630;

const contextForInput: Record<
  Exclude<ThreadInputKind, "document">,
  ContextTarget
> = {
  source: "sources",
  question: "questions",
  decision: "decisions",
  comment: "comments",
  branch: "branches",
};

const inputIcons = {
  document: FileText,
  source: Link2,
  question: Lightbulb,
  decision: CircleDot,
  comment: MessageSquare,
  branch: GitBranch,
} satisfies Record<ThreadInputKind, typeof FileText>;

function itemText(item: ThinkingItem | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function formatThreadDate(value: string | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Time not recorded";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

function countdownLabel(nextDreamAt: string, now: Date | null) {
  if (!now || !Number.isFinite(Date.parse(nextDreamAt))) return "overnight";
  const milliseconds = Math.max(0, Date.parse(nextDreamAt) - now.getTime());
  const minutes = Math.ceil(milliseconds / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `in ${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

function inputBreakdown(inputs: ThreadInput[]) {
  const counts = new Map<ThreadInputKind, number>();
  for (const input of inputs) {
    counts.set(input.kind, (counts.get(input.kind) ?? 0) + 1);
  }
  return [...counts.entries()];
}

function changeLabel(changes: ThreadChangeCount) {
  return `${changes.blocks} ${changes.blocks === 1 ? "change" : "changes"}`;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function orthogonalPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  if (fromX === toX) return `M ${fromX} ${fromY} V ${toY}`;

  const middleY = fromY + (toY - fromY) / 2;
  const direction = toX > fromX ? 1 : -1;
  const radius = Math.min(
    10,
    Math.abs(toX - fromX) / 4,
    Math.abs(toY - fromY) / 4,
  );

  return [
    `M ${fromX} ${fromY}`,
    `V ${middleY - radius}`,
    `Q ${fromX} ${middleY} ${fromX + direction * radius} ${middleY}`,
    `H ${toX - direction * radius}`,
    `Q ${toX} ${middleY} ${toX} ${middleY + radius}`,
    `V ${toY}`,
  ].join(" ");
}

function versionLabel(version: ThinkingItem | undefined, fallback: string) {
  return itemText(version, "label") || fallback;
}

function dreamArgument(insight: LoopInsight | undefined) {
  const value = insight?.reasoning_model;
  if (!value || typeof value !== "object") {
    return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };
  }
  const graph = value as Record<string, unknown>;
  const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const nodes = rawNodes.flatMap((value): GraphNode[] => {
    if (!value || typeof value !== "object") return [];
    const node = value as Record<string, unknown>;
    if (typeof node.key !== "string" || typeof node.label !== "string") return [];
    return [{
      id: `latest-dream:${node.key}`,
      key: node.key,
      type: typeof node.type === "string" ? node.type : "claim",
      label: node.label,
      detail: typeof node.detail === "string" ? node.detail : "",
      status: typeof node.status === "string" ? node.status : "active",
      confidence: typeof node.confidence === "number" ? node.confidence : null,
      origin: "dream",
    }];
  });
  const idByKey = new Map(nodes.map((node) => [node.key, node.id]));
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const edges = rawEdges.flatMap((value, index): GraphEdge[] => {
    if (!value || typeof value !== "object") return [];
    const edge = value as Record<string, unknown>;
    const from =
      typeof edge.fromKey === "string" ? idByKey.get(edge.fromKey) : undefined;
    const to =
      typeof edge.toKey === "string" ? idByKey.get(edge.toKey) : undefined;
    if (!from || !to) return [];
    return [{
      id: `latest-dream-edge:${index}:${from}:${to}`,
      from,
      to,
      relation:
        typeof edge.relation === "string" ? edge.relation : "supports",
      origin: "dream",
    }];
  });
  return { nodes, edges };
}

function ThreadNode({
  tone,
  icon: Icon,
  eyebrow,
  title,
  detail,
  meta,
  x,
  y,
  width,
  height,
  status = "complete",
  pending = false,
  pulse = false,
  nodeRef,
  onClick,
}: {
  tone: "human" | "work" | "dream" | "review";
  icon: typeof FileText;
  eyebrow: string;
  title: string;
  detail: string;
  meta?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status?: "complete" | "active" | "pending" | "attention";
  pending?: boolean;
  pulse?: boolean;
  nodeRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
}) {
  const statusLabel = {
    complete: "Complete",
    active: "Live",
    pending: "Scheduled",
    attention: "Attention",
  }[status];

  return (
    <button
      ref={nodeRef}
      type="button"
      data-status={status}
      data-tone={tone}
      className={`${styles.threadNode} ${pending ? styles.pendingNode : ""} ${pulse ? styles.frontierPulse : ""}`}
      style={{ left: x, top: y, width, height }}
      onClick={onClick}
    >
      <span aria-hidden="true" className={styles.topPort} />
      <span className="flex h-full flex-col px-3.5 py-3">
        <span className="flex items-start gap-3">
          <span className={styles.nodeIcon}>
            <Icon className="size-3.5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {eyebrow}
              </span>
              <span className={styles.statusLabel}>
                <span className={styles.statusDot} />
                {statusLabel}
              </span>
            </span>
            <span className="mt-1 line-clamp-2 block text-[13px] font-semibold leading-[1.05rem] tracking-[-0.01em]">
              {title}
            </span>
          </span>
        </span>
        <span className="mt-2 line-clamp-2 block text-[11px] leading-[1rem] text-muted-foreground">
          {detail}
        </span>
        <span className="mt-auto flex items-center justify-between gap-3 pt-2">
          {meta ? (
            <span className="block min-w-0 truncate font-mono text-[9px] text-muted-foreground">
              {meta}
            </span>
          ) : (
            <span />
          )}
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/55" />
        </span>
      </span>
      <span aria-hidden="true" className={styles.bottomPort} />
    </button>
  );
}

function CycleBand({
  index,
  top,
  date,
  frontier = false,
}: {
  index: number;
  top: number;
  date: string;
  frontier?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.cycleBand} ${frontier ? styles.frontierBand : ""}`}
      style={{ top }}
    >
      <div className={styles.cycleBandHeader}>
        <span className={styles.cycleIndex}>
          {frontier ? "NOW" : String(index + 1).padStart(2, "0")}
        </span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
          {frontier ? "Current cycle" : "Dream cycle"}
        </span>
        <span className="h-px flex-1 bg-border/80" />
        <span className="font-mono text-[9px] text-muted-foreground">
          {date}
        </span>
        <span className={frontier ? styles.liveBadge : styles.completeBadge}>
          <span />
          {frontier ? "In progress" : "Complete"}
        </span>
      </div>
    </div>
  );
}

function ThreadFlowPath({
  d,
  tone,
  pending = false,
  live = false,
}: {
  d: string;
  tone: "human" | "work" | "dream";
  pending?: boolean;
  live?: boolean;
}) {
  const color = {
    human: "#31956a",
    work: "#8d8a83",
    dream: "#7957e8",
  }[tone];
  const marker = {
    human: "url(#thread-arrow-green)",
    work: "url(#thread-arrow-neutral)",
    dream: "url(#thread-arrow-violet)",
  }[tone];

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeDasharray={pending ? "5 5" : undefined}
        strokeOpacity={pending ? 0.48 : 0.58}
        strokeWidth="1.5"
        markerEnd={marker}
      />
      {live && (
        <>
          <path
            d={d}
            fill="none"
            pathLength="100"
            stroke={color}
            strokeOpacity="0.82"
            strokeWidth="2"
            className={styles.flowPath}
            style={{ color }}
          />
          <circle r="3" fill={color} className={styles.edgeTracer}>
            <animateMotion dur="2.4s" path={d} repeatCount="indefinite" />
          </circle>
        </>
      )}
    </g>
  );
}

function MobileThreadNode({
  tone,
  icon: Icon,
  eyebrow,
  title,
  detail,
  meta,
  pending = false,
  pulse = false,
  last = false,
  nodeRef,
  onClick,
}: {
  tone: "human" | "work" | "dream" | "review";
  icon: typeof FileText;
  eyebrow: string;
  title: string;
  detail: string;
  meta?: string;
  pending?: boolean;
  pulse?: boolean;
  last?: boolean;
  nodeRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
}) {
  const toneClass = {
    human: "border-l-[3px] border-l-emerald-600",
    work: "border-l-[3px] border-l-neutral-500",
    dream: "border-l-[3px] border-l-violet-600",
    review: "border-l-[3px] border-l-amber-500",
  }[tone];
  const iconClass = {
    human: "border-emerald-300 bg-emerald-50 text-emerald-800",
    work: "border-neutral-300 bg-white text-neutral-700",
    dream: "border-violet-300 bg-violet-50 text-violet-800",
    review: "border-amber-300 bg-amber-50 text-amber-800",
  }[tone];

  return (
    <div className={`relative pl-10 ${last ? "" : "pb-7"}`}>
      {!last && (
        <span
          aria-hidden="true"
          className={`absolute bottom-0 left-[15px] top-8 w-px bg-border ${styles.mobileFlowLine}`}
        />
      )}
      <span
        aria-hidden="true"
        className={`absolute left-1 top-4 z-10 grid size-6 place-items-center rounded-full border ${iconClass}`}
      >
        <Icon className="size-3" />
      </span>
      <button
        ref={nodeRef}
        type="button"
        className={`w-full rounded-xl border bg-white p-3.5 text-left shadow-[0_2px_9px_rgba(28,25,23,0.055)] transition hover:border-neutral-400 hover:shadow-[0_7px_18px_rgba(28,25,23,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${toneClass} ${pending ? "border-dashed" : ""} ${pulse ? styles.frontierPulse : ""}`}
        onClick={onClick}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </span>
            <span className="mt-1 block text-sm font-semibold leading-5">
              {title}
            </span>
          </span>
          <ChevronRight className="mt-1 size-3 shrink-0 text-muted-foreground/60" />
        </span>
        <span className="mt-2.5 block text-xs leading-[1.15rem] text-muted-foreground">
          {detail}
        </span>
        {meta && (
          <span className="mt-3 block font-mono text-[10px] text-muted-foreground">
            {meta}
          </span>
        )}
      </button>
    </div>
  );
}

function ThreadMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-24 rounded-xl border bg-background/80 px-3 py-2.5">
      <p className="font-mono text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ThreadSummaryMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className={styles.summaryMetric}>
      <p className="font-mono text-[13px] font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function ThreadInspector({
  selection,
  now,
  onOpenContext,
}: {
  selection: ThreadSelection | null;
  now: Date | null;
  onOpenContext: (target: ContextTarget, id?: string) => void;
}) {
  if (!selection) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            How it works
          </p>
          <h3 className="mt-2 text-lg font-semibold">A read model, not another Loop</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This view joins stored versions, contributions, Dreams, and review
            records. Opening it uses zero model calls.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-xs leading-5">
          <p className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            Green is human work.
          </p>
          <p className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-violet-500" />
            Purple is stored Dream output.
          </p>
          <p className="flex items-center gap-2">
            <span className="h-px w-4 border-t border-dashed border-neutral-500" />
            Dotted paths have not happened yet.
          </p>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Select any node to inspect the exact records behind it.
        </p>
      </div>
    );
  }

  if (selection.type === "version") {
    const source = itemText(selection.version, "source") || "working state";
    return (
      <div className="space-y-4">
        <div>
          <Badge variant="outline">Work</Badge>
          <h3 className="mt-3 text-lg font-semibold">{selection.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {selection.note}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-muted-foreground">Source</dt>
            <dd className="mt-1 font-medium">{source.replaceAll("_", " ")}</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-muted-foreground">Recorded</dt>
            <dd className="mt-1 font-medium">
              {formatThreadDate(selection.version?.created_at)}
            </dd>
          </div>
        </dl>
        {selection.changes && (
          <div className="rounded-xl border p-3">
            <p className="text-xs font-semibold">Exact text diff</p>
            <p className="mt-2 font-mono text-sm">
              {changeLabel(selection.changes)} · +{selection.changes.addedLines} −
              {selection.changes.removedLines} lines
            </p>
          </div>
        )}
        <Button className="w-full" variant="outline" onClick={() => onOpenContext("history")}>
          <FileDiff />
          Open Versions
        </Button>
      </div>
    );
  }

  if (selection.type === "inputs") {
    return (
      <div className="space-y-4">
        <div>
          <Badge className="bg-emerald-600">Human</Badge>
          <h3 className="mt-3 text-lg font-semibold">{selection.title}</h3>
          <p className="mt-2 font-mono text-sm">
            {changeLabel(selection.changes)} · +{selection.changes.addedLines} −
            {selection.changes.removedLines} document lines
          </p>
        </div>
        <div className="space-y-2">
          {selection.inputs.length ? (
            selection.inputs.map((input) => {
              const Icon = inputIcons[input.kind];
              return (
                <button
                  key={`${input.kind}:${input.id}`}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-xl border bg-emerald-50/45 p-3 text-left hover:border-emerald-400/60"
                  onClick={() => {
                    if (input.kind === "document") {
                      onOpenContext("history");
                    } else {
                      onOpenContext(contextForInput[input.kind], input.id);
                    }
                  }}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-800" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {input.title}
                    </span>
                    {input.detail && (
                      <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-muted-foreground">
                        {input.detail}
                      </span>
                    )}
                  </span>
                  {input.referencedByDream && (
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      cited
                    </Badge>
                  )}
                </button>
              );
            })
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">
              No new contribution is waiting. The daily Dream will skip this
              project unless something changes.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (selection.type === "dream") {
    const { cycle } = selection;
    return (
      <div className="space-y-4">
        <div>
          <Badge className="bg-violet-600">Dream</Badge>
          <h3 className="mt-3 text-lg font-semibold">
            {cycle.run.status === "failed" ? "Dream stopped safely" : "Overnight Dream"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {cycle.insight?.summary ||
              cycle.run.error_message ||
              "The stored Dream result has no summary."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ThreadMetric value={cycle.dreamChanges.blocks} label="document changes" />
          <ThreadMetric value={cycle.critiques.length} label="comments left" />
          <ThreadMetric value={cycle.changeDetails.length} label="explained changes" />
          <ThreadMetric value={cycle.openCritiques} label="open critiques" />
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-xs font-semibold">Deterministic diff</p>
          <p className="mt-2 font-mono text-sm">
            +{cycle.dreamChanges.addedLines} −{cycle.dreamChanges.removedLines} lines
          </p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
            Computed from the linked Before and After versions. No model call.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="outline" onClick={() => onOpenContext("critique")}>
            <Sparkles />
            Critique
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => onOpenContext("history")}>
            <FileDiff />
            Diff
          </Button>
        </div>
      </div>
    );
  }

  if (selection.type === "review") {
    const { cycle } = selection;
    const statuses = [
      ...cycle.dreamReviews.map((review) => review.status),
      ...cycle.critiqueReviews.map((review) => review.status),
    ];
    return (
      <div className="space-y-4">
        <div>
          <Badge variant="outline" className="border-amber-400 text-amber-800">
            Review
          </Badge>
          <h3 className="mt-3 text-lg font-semibold">What people did next</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review is stored as product state. It becomes human direction for
            the next Dream.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ThreadMetric value={cycle.reviewActions} label="review actions" />
          <ThreadMetric value={cycle.openCritiques} label="still open" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statuses.length ? (
            statuses.map((status, index) => (
              <Badge key={`${status}:${index}`} variant="secondary">
                {status}
              </Badge>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Nothing reviewed yet.</p>
          )}
        </div>
        <Button className="w-full" variant="outline" onClick={() => onOpenContext("critique")}>
          <MessageSquare />
          Open review comments
        </Button>
      </div>
    );
  }

  const { frontier } = selection;
  return (
    <div className="space-y-4">
      <div>
        <Badge className="bg-violet-600">
          {frontier.activeRun ? "Dreaming now" : "Tonight"}
        </Badge>
        <h3 className="mt-3 text-lg font-semibold">
          {frontier.activeRun ? frontier.activeRun.progress_stage : "Next Dream"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {frontier.activeRun
            ? `${frontier.activeRun.progress_percent}% complete. You can leave and come back.`
            : `${formatThreadDate(frontier.nextDreamAt)} · ${countdownLabel(frontier.nextDreamAt, now)}`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ThreadMetric value={frontier.inputs.length} label="inputs waiting" />
        <ThreadMetric value={frontier.humanChanges.blocks} label="document changes" />
      </div>
      <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-3 text-xs leading-5">
        The dotted node is a schedule, not generated analysis. It becomes a
        stored Dream only after the overnight workflow runs.
      </div>
      <Button className="w-full" variant="outline" onClick={() => onOpenContext("loops")}>
        <Moon />
        Open Dream report
      </Button>
    </div>
  );
}

export function ProjectThread({
  project,
  currentCheckpointId,
  currentDocumentText,
  versions,
  runs,
  insights,
  sources,
  questions,
  decisions,
  comments,
  branches,
  dreamChangeReviews,
  critiqueReviews,
  reasoningNodes,
  reasoningEdges,
  onOpenContext,
}: {
  project: Project;
  currentCheckpointId: string | null;
  currentDocumentText: string;
  versions: ThinkingItem[];
  runs: LoopRun[];
  insights: LoopInsight[];
  sources: ThinkingItem[];
  questions: ThinkingItem[];
  decisions: ThinkingItem[];
  comments: ThinkingItem[];
  branches: ThinkingItem[];
  dreamChangeReviews: DreamChangeReview[];
  critiqueReviews: CritiqueReview[];
  reasoningNodes: ReasoningNode[];
  reasoningEdges: ReasoningEdge[];
  onOpenContext: (target: ContextTarget, id?: string) => void;
}) {
  const [view, setView] = useState<"thread" | "argument">("thread");
  const [selection, setSelection] = useState<ThreadSelection | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const desktopFrontierNode = useRef<HTMLButtonElement>(null);
  const mobileFrontierNode = useRef<HTMLButtonElement>(null);
  const thread = useMemo(
    () =>
      deriveProjectThread({
        projectCreatedAt: project.created_at,
        nextDreamAt: project.next_daily_loop_at,
        currentCheckpointId,
        currentDocumentText,
        versions,
        runs,
        insights,
        dreamChangeReviews,
        critiqueReviews,
        sources,
        questions,
        decisions,
        comments,
        branches,
      }),
    [
      branches,
      comments,
      critiqueReviews,
      currentCheckpointId,
      currentDocumentText,
      decisions,
      dreamChangeReviews,
      insights,
      project.created_at,
      project.next_daily_loop_at,
      questions,
      runs,
      sources,
      versions,
    ],
  );
  const latestInsight = insights.find((insight) =>
    runs.some(
      (run) => run.id === insight.loop_run_id && run.is_dream,
    ),
  );
  const latestDreamArgument = useMemo(
    () => dreamArgument(latestInsight),
    [latestInsight],
  );
  const durableArgumentNodes: GraphNode[] = reasoningNodes.map((node) => ({
    id: node.id,
    key: node.stable_key ?? node.id,
    type: node.node_type,
    label: node.label,
    detail: node.detail,
    status: node.status,
    confidence: node.confidence,
    origin: node.origin,
  }));
  const durableArgumentEdges: GraphEdge[] = reasoningEdges.map((edge) => ({
    id: edge.id,
    from: edge.from_node_id,
    to: edge.to_node_id,
    relation: edge.relation,
    origin: edge.origin,
  }));
  const argumentNodes = durableArgumentNodes.length
    ? durableArgumentNodes
    : latestDreamArgument.nodes;
  const argumentEdges = durableArgumentEdges.length
    ? durableArgumentEdges
    : latestDreamArgument.edges;
  const jumpToNow = useCallback(() => {
    const candidates = [
      mobileFrontierNode.current,
      desktopFrontierNode.current,
    ];
    const node =
      candidates.find((candidate) => candidate?.getClientRects().length) ??
      desktopFrontierNode.current ??
      mobileFrontierNode.current;
    if (typeof node?.scrollIntoView === "function") {
      node.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    }
  }, []);

  useEffect(() => {
    const ready = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearTimeout(ready);
      window.clearInterval(timer);
    };
  }, []);

  const frontierCycleTop = cycleStartY + thread.cycles.length * cycleStep;
  const frontierContributionY = frontierCycleTop + contributionOffset;
  const frontierCurrentY = frontierCycleTop + beforeDreamOffset;
  const frontierDreamY = frontierCycleTop + dreamOffset;
  const canvasHeight = frontierCycleTop + 530;
  const currentVersionTitle =
    versionLabel(thread.frontier.baseVersion, "Current project state");
  const frontierInputSummary = thread.frontier.inputs.length
    ? inputBreakdown(thread.frontier.inputs)
        .map(([kind, count]) => `${count} ${kind}`)
        .join(" · ")
    : "No new activity yet";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f3ef]">
      <div className="border-b bg-[#fffefa] px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Network className="size-4 text-violet-700" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                The Thread
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.025em]">
              See how the work got here.
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Every input, version, Dream, and review in one inspectable workflow.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <Badge
              variant="outline"
              aria-label="Opening this view uses 0 model calls"
              className="h-8 gap-1.5 bg-white px-3 font-mono text-[9px]"
            >
              <Check className="size-3 text-emerald-700" />
              0 model calls
            </Badge>
            {view === "thread" && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={jumpToNow}
              >
                <ArrowDown />
                Now
              </Button>
            )}
            <div className="flex rounded-lg border bg-muted/40 p-1">
              <Button
                size="sm"
                variant={view === "thread" ? "secondary" : "ghost"}
                className="h-7"
                onClick={() => setView("thread")}
              >
                <Network />
                Thread
              </Button>
              <Button
                size="sm"
                variant={view === "argument" ? "secondary" : "ghost"}
                className="h-7"
                onClick={() => setView("argument")}
              >
                <GitBranch />
                Argument
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.summaryStrip}>
          <ThreadSummaryMetric value={thread.totals.dreams} label="Dreams" />
          <ThreadSummaryMetric value={thread.totals.inputs} label="Human inputs" />
          <ThreadSummaryMetric value={thread.totals.dreamChanges} label="Dream changes" />
          <ThreadSummaryMetric value={thread.totals.critiques} label="Dream comments" />
          <ThreadSummaryMetric value={thread.totals.reviewActions} label="Review actions" />
        </div>
      </div>

      {view === "argument" ? (
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-4 rounded-xl border bg-background p-4">
              <p className="text-sm font-semibold">Argument view</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This is the reasoning layer: evidence, assumptions, claims, and
                decisions. The Thread remains the primary workflow history.
              </p>
            </div>
            <ReasoningGraph nodes={argumentNodes} edges={argumentEdges} />
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <div className={`${styles.mobileTimeline} ${styles.mobileOnly} mx-auto max-w-lg px-4 py-6`}>
              <MobileThreadNode
                tone="work"
                icon={FileText}
                eyebrow={thread.cycles.length ? "Starting version" : "Project"}
                title={
                  thread.cycles.length
                    ? versionLabel(thread.cycles[0].baseVersion, "Project start")
                    : currentVersionTitle
                }
                detail={
                  thread.cycles.length
                    ? "The recorded state before this visible part of the Thread."
                    : "The project’s current working document."
                }
                meta={formatThreadDate(project.created_at)}
                onClick={() =>
                  setSelection({
                    type: "version",
                    title: thread.cycles.length
                      ? versionLabel(thread.cycles[0].baseVersion, "Project start")
                      : currentVersionTitle,
                    version:
                      thread.cycles[0]?.baseVersion ?? thread.frontier.baseVersion,
                    note: "A durable point on the document’s version spine.",
                  })
                }
              />

              {thread.cycles.map((cycle, index) => {
                const inputSummary = cycle.inputs.length
                  ? inputBreakdown(cycle.inputs)
                      .map(([kind, count]) => `${count} ${kind}`)
                      .join(" · ")
                  : "No separately stored inputs";
                const dreamDetail =
                  cycle.run.status === "failed"
                    ? cycle.run.error_message || "Stopped safely"
                    : cycle.afterVersion
                      ? `${changeLabel(cycle.dreamChanges)} · +${cycle.dreamChanges.addedLines} −${cycle.dreamChanges.removedLines} lines`
                      : `${cycle.critiques.length} comments · no rewrite`;
                return (
                  <div key={`mobile:${cycle.id}`}>
                    <div className="mb-3 ml-10 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      <span className="inline-flex size-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-[9px] text-emerald-800">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      Dream cycle · {formatThreadDate(cycle.run.created_at)}
                    </div>
                    <MobileThreadNode
                      tone="human"
                      icon={UserRound}
                      eyebrow="Contributions"
                      title={countLabel(cycle.inputs.length, "input")}
                      detail={inputSummary}
                      meta={`${changeLabel(cycle.humanChanges)} in document`}
                      onClick={() =>
                        setSelection({
                          type: "inputs",
                          title: "What people added",
                          inputs: cycle.inputs,
                          changes: cycle.humanChanges,
                        })
                      }
                    />
                    <MobileThreadNode
                      tone="work"
                      icon={FileDiff}
                      eyebrow="Before Dream"
                      title={versionLabel(cycle.beforeVersion, "Pre-Dream snapshot")}
                      detail="The exact document the Dream read."
                      meta={formatThreadDate(
                        cycle.beforeVersion?.created_at ?? cycle.run.created_at,
                      )}
                      onClick={() =>
                        setSelection({
                          type: "version",
                          title: versionLabel(
                            cycle.beforeVersion,
                            "Pre-Dream snapshot",
                          ),
                          version: cycle.beforeVersion,
                          note: "The immutable document state immediately before this Dream.",
                          changes: cycle.humanChanges,
                        })
                      }
                    />
                    <MobileThreadNode
                      tone="dream"
                      icon={cycle.run.status === "failed" ? Bot : Moon}
                      eyebrow={
                        cycle.run.status === "failed"
                          ? "Dream stopped"
                          : "Overnight Dream"
                      }
                      title={
                        cycle.insight?.summary ||
                        (cycle.run.status === "failed"
                          ? "Stopped safely"
                          : "Dream report")
                      }
                      detail={dreamDetail}
                      meta={`${cycle.critiques.length} comments · ${cycle.changeDetails.length} explained`}
                      onClick={() => setSelection({ type: "dream", cycle })}
                    />
                    <MobileThreadNode
                      tone="work"
                      icon={cycle.afterVersion ? FileText : Check}
                      eyebrow={cycle.afterVersion ? "Next version" : "Work"}
                      title={
                        cycle.afterVersion
                          ? versionLabel(cycle.afterVersion, "After Dream")
                          : "Document unchanged"
                      }
                      detail={
                        cycle.afterVersion
                          ? "A linked, restorable result of the Dream."
                          : "The Dream left criticism without forcing a rewrite."
                      }
                      meta={formatThreadDate(
                        cycle.afterVersion?.created_at ??
                          cycle.run.completed_at ??
                          cycle.run.created_at,
                      )}
                      onClick={() =>
                        setSelection({
                          type: "version",
                          title: cycle.afterVersion
                            ? versionLabel(cycle.afterVersion, "After Dream")
                            : "Document unchanged",
                          version: cycle.afterVersion ?? cycle.beforeVersion,
                          note: cycle.afterVersion
                            ? "The restorable document version produced by this Dream."
                            : "This Dream added commentary but did not replace the document.",
                          changes: cycle.dreamChanges,
                        })
                      }
                    />
                    <MobileThreadNode
                      tone="review"
                      icon={MessageSquare}
                      eyebrow="Morning review"
                      title={`${countLabel(cycle.reviewActions, "action")} · ${cycle.openCritiques} open`}
                      detail={
                        cycle.reviewActions
                          ? "Kept, reverted, answered, dismissed, or branched."
                          : "Waiting for a human response."
                      }
                      meta="Feeds the next Dream"
                      onClick={() => setSelection({ type: "review", cycle })}
                    />
                  </div>
                );
              })}

              <div className="mb-3 ml-10 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-violet-800">
                <span className="inline-flex h-5 items-center rounded-full border border-violet-300 bg-violet-50 px-2 text-[9px]">
                  Now
                </span>
                Current activity
              </div>
              <MobileThreadNode
                tone="human"
                icon={UserRound}
                eyebrow="Since the last Dream"
                title={`${countLabel(thread.frontier.inputs.length, "input")} waiting`}
                detail={frontierInputSummary}
                meta={`${changeLabel(thread.frontier.humanChanges)} in document`}
                onClick={() =>
                  setSelection({
                    type: "inputs",
                    title: "Waiting for the next Dream",
                    inputs: thread.frontier.inputs,
                    changes: thread.frontier.humanChanges,
                  })
                }
              />
              <MobileThreadNode
                tone="work"
                icon={FileText}
                eyebrow="Current draft"
                title={currentVersionTitle}
                detail="What the next Dream will read, including today’s edits."
                meta={`+${thread.frontier.humanChanges.addedLines} −${thread.frontier.humanChanges.removedLines} lines`}
                onClick={() =>
                  setSelection({
                    type: "version",
                    title: "Current draft",
                    version: thread.frontier.baseVersion,
                    note: "The live canonical document at the edge of the Thread.",
                    changes: thread.frontier.humanChanges,
                  })
                }
              />
              <MobileThreadNode
                tone="dream"
                icon={thread.frontier.activeRun ? Sparkles : Clock3}
                eyebrow={
                  thread.frontier.activeRun ? "Dreaming now" : "Tonight’s Dream"
                }
                title={
                  thread.frontier.activeRun
                    ? thread.frontier.activeRun.progress_stage
                    : countdownLabel(thread.frontier.nextDreamAt, now)
                }
                detail={
                  thread.frontier.activeRun
                    ? `${thread.frontier.activeRun.progress_percent}% complete`
                    : thread.frontier.inputs.length
                      ? "Will read the waiting inputs overnight."
                      : "Will skip unless something new is added."
                }
                meta={
                  thread.frontier.activeRun
                    ? "Durable workflow running"
                    : formatThreadDate(thread.frontier.nextDreamAt)
                }
                pending={!thread.frontier.activeRun}
                pulse
                last
                nodeRef={mobileFrontierNode}
                onClick={() =>
                  setSelection({ type: "frontier", frontier: thread.frontier })
                }
              />
            </div>

            <div
              className={`${styles.canvasViewport} ${styles.canvas} ${styles.desktopOnly} relative mx-auto`}
              data-flow-direction="top-to-bottom"
              role="group"
              aria-label="Project workflow over time"
              style={{ width: canvasWidth, height: canvasHeight }}
            >
              <div
                className={styles.laneHeader}
                data-tone="human"
                style={{ left: humanX }}
              >
                <UserRound className="size-3" />
                Human input
              </div>
              <div className={styles.laneHeader} style={{ left: workX }}>
                <FileText className="size-3" />
                Document state
              </div>
              <div
                className={styles.laneHeader}
                data-tone="dream"
                style={{ left: dreamX }}
              >
                <Moon className="size-3" />
                Dream + review
              </div>

              {[humanX, workX, dreamX].map((left) => (
                <span
                  key={`guide:${left}`}
                  aria-hidden="true"
                  className={styles.laneGuide}
                  style={{ left: left + nodeWidth / 2 }}
                />
              ))}

              {thread.cycles.map((cycle, index) => (
                <CycleBand
                  key={`band:${cycle.id}`}
                  index={index}
                  top={cycleStartY + index * cycleStep}
                  date={formatThreadDate(cycle.run.created_at)}
                />
              ))}
              <CycleBand
                index={thread.cycles.length}
                top={frontierCycleTop}
                date={formatThreadDate(thread.frontier.nextDreamAt)}
                frontier
              />

              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1]"
                width={canvasWidth}
                height={canvasHeight}
              >
                <defs>
                  <marker
                    id="thread-arrow-green"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5.5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill="#31956a" />
                  </marker>
                  <marker
                    id="thread-arrow-violet"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5.5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill="#7957e8" />
                  </marker>
                  <marker
                    id="thread-arrow-neutral"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5.5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill="#8d8a83" />
                  </marker>
                </defs>

                {thread.cycles.map((cycle, index) => {
                  const cycleTop = cycleStartY + index * cycleStep;
                  const contributionY = cycleTop + contributionOffset;
                  const beforeY = cycleTop + beforeDreamOffset;
                  const dreamY = cycleTop + dreamOffset;
                  const outputY = cycleTop + outputOffset;
                  const sourceY =
                    index === 0
                      ? firstVersionY + standardNodeHeight
                      : cycleStartY +
                        (index - 1) * cycleStep +
                        outputOffset +
                        standardNodeHeight;
                  const previousReviewY =
                    cycleStartY +
                    (index - 1) * cycleStep +
                    outputOffset +
                    standardNodeHeight;
                  const workCenter = workX + workWidth / 2;
                  const humanCenter = humanX + humanWidth / 2;
                  const dreamCenter = dreamX + dreamWidth / 2;

                  return (
                    <g key={`edges:${cycle.id}`}>
                      <ThreadFlowPath
                        d={orthogonalPath(
                          workCenter,
                          sourceY,
                          humanCenter,
                          contributionY,
                        )}
                        tone="human"
                      />
                      {index > 0 && (
                        <ThreadFlowPath
                          d={orthogonalPath(
                            dreamCenter,
                            previousReviewY,
                            humanCenter,
                            contributionY,
                          )}
                          tone="work"
                        />
                      )}
                      <ThreadFlowPath
                        d={orthogonalPath(
                          humanCenter,
                          contributionY + contributionHeight,
                          workCenter,
                          beforeY,
                        )}
                        tone="human"
                      />
                      <ThreadFlowPath
                        d={orthogonalPath(
                          workCenter,
                          beforeY + standardNodeHeight,
                          dreamCenter,
                          dreamY,
                        )}
                        tone="dream"
                      />
                      <ThreadFlowPath
                        d={orthogonalPath(
                          dreamCenter,
                          dreamY + dreamNodeHeight,
                          workCenter,
                          outputY,
                        )}
                        tone="dream"
                      />
                      <ThreadFlowPath
                        d={orthogonalPath(
                          dreamCenter,
                          dreamY + dreamNodeHeight,
                          dreamCenter,
                          outputY,
                        )}
                        tone="work"
                      />
                    </g>
                  );
                })}

                {(() => {
                  const workCenter = workX + workWidth / 2;
                  const humanCenter = humanX + humanWidth / 2;
                  const dreamCenter = dreamX + dreamWidth / 2;
                  const sourceY = thread.cycles.length
                    ? cycleStartY +
                      (thread.cycles.length - 1) * cycleStep +
                      outputOffset +
                      standardNodeHeight
                    : firstVersionY + standardNodeHeight;

                  return (
                    <g>
                      <ThreadFlowPath
                        d={orthogonalPath(
                          workCenter,
                          sourceY,
                          humanCenter,
                          frontierContributionY,
                        )}
                        tone="human"
                        live
                      />
                      {thread.cycles.length > 0 && (
                        <ThreadFlowPath
                          d={orthogonalPath(
                            dreamCenter,
                            sourceY,
                            humanCenter,
                            frontierContributionY,
                          )}
                          tone="work"
                          live
                        />
                      )}
                      <ThreadFlowPath
                        d={orthogonalPath(
                          humanCenter,
                          frontierContributionY + contributionHeight,
                          workCenter,
                          frontierCurrentY,
                        )}
                        tone="human"
                        live
                      />
                      <ThreadFlowPath
                        d={orthogonalPath(
                          workCenter,
                          frontierCurrentY + standardNodeHeight,
                          dreamCenter,
                          frontierDreamY,
                        )}
                        tone="dream"
                        pending={!thread.frontier.activeRun}
                        live
                      />
                    </g>
                  );
                })()}
              </svg>

              <ThreadNode
                tone="work"
                icon={FileText}
                eyebrow={thread.cycles.length ? "Starting version" : "Project"}
                title={
                  thread.cycles.length
                    ? versionLabel(thread.cycles[0].baseVersion, "Project start")
                    : currentVersionTitle
                }
                detail={
                  thread.cycles.length
                    ? "Recorded state before the first visible cycle."
                    : "The project’s current working document."
                }
                meta={formatThreadDate(project.created_at)}
                x={workX}
                y={firstVersionY}
                width={workWidth}
                height={standardNodeHeight}
                onClick={() =>
                  setSelection({
                    type: "version",
                    title: thread.cycles.length
                      ? versionLabel(thread.cycles[0].baseVersion, "Project start")
                      : currentVersionTitle,
                    version:
                      thread.cycles[0]?.baseVersion ?? thread.frontier.baseVersion,
                    note: "A durable point on the document’s version spine.",
                  })
                }
              />

              {thread.cycles.map((cycle, index) => {
                const cycleTop = cycleStartY + index * cycleStep;
                const contributionY = cycleTop + contributionOffset;
                const beforeY = cycleTop + beforeDreamOffset;
                const dreamY = cycleTop + dreamOffset;
                const outputY = cycleTop + outputOffset;
                const inputSummary = cycle.inputs.length
                  ? inputBreakdown(cycle.inputs)
                      .map(([kind, count]) => `${count} ${kind}`)
                      .join(" · ")
                  : "No separately stored inputs";
                const dreamDetail =
                  cycle.run.status === "failed"
                    ? cycle.run.error_message || "Stopped safely"
                    : cycle.afterVersion
                      ? `${changeLabel(cycle.dreamChanges)} · +${cycle.dreamChanges.addedLines} −${cycle.dreamChanges.removedLines} lines`
                      : `${cycle.critiques.length} comments · no rewrite`;

                return (
                  <div key={cycle.id}>
                    <ThreadNode
                      tone="human"
                      icon={UserRound}
                      eyebrow="Contributions"
                      title={countLabel(cycle.inputs.length, "input")}
                      detail={inputSummary}
                      meta={`${changeLabel(cycle.humanChanges)} in document`}
                      x={humanX}
                      y={contributionY}
                      width={humanWidth}
                      height={contributionHeight}
                      onClick={() =>
                        setSelection({
                          type: "inputs",
                          title: "What people added",
                          inputs: cycle.inputs,
                          changes: cycle.humanChanges,
                        })
                      }
                    />
                    <ThreadNode
                      tone="work"
                      icon={FileDiff}
                      eyebrow="Before Dream"
                      title={versionLabel(cycle.beforeVersion, "Pre-Dream snapshot")}
                      detail="The exact document the Dream read."
                      meta={formatThreadDate(
                        cycle.beforeVersion?.created_at ?? cycle.run.created_at,
                      )}
                      x={workX}
                      y={beforeY}
                      width={workWidth}
                      height={standardNodeHeight}
                      onClick={() =>
                        setSelection({
                          type: "version",
                          title: versionLabel(
                            cycle.beforeVersion,
                            "Pre-Dream snapshot",
                          ),
                          version: cycle.beforeVersion,
                          note: "The immutable document state immediately before this Dream.",
                          changes: cycle.humanChanges,
                        })
                      }
                    />
                    <ThreadNode
                      tone="dream"
                      icon={cycle.run.status === "failed" ? Bot : Moon}
                      eyebrow={
                        cycle.run.status === "failed"
                          ? "Dream stopped"
                          : "Overnight Dream"
                      }
                      title={
                        cycle.insight?.summary ||
                        (cycle.run.status === "failed"
                          ? "Stopped safely"
                          : "Dream report")
                      }
                      detail={dreamDetail}
                      meta={`${cycle.critiques.length} comments · ${cycle.changeDetails.length} explained`}
                      x={dreamX}
                      y={dreamY}
                      width={dreamWidth}
                      height={dreamNodeHeight}
                      status={
                        cycle.run.status === "failed" ? "attention" : "complete"
                      }
                      onClick={() => setSelection({ type: "dream", cycle })}
                    />
                    <ThreadNode
                      tone="work"
                      icon={cycle.afterVersion ? FileText : Check}
                      eyebrow={cycle.afterVersion ? "Next version" : "Work"}
                      title={
                        cycle.afterVersion
                          ? versionLabel(cycle.afterVersion, "After Dream")
                          : "Document unchanged"
                      }
                      detail={
                        cycle.afterVersion
                          ? "Restorable output linked to this Dream."
                          : "Criticism was added without a forced rewrite."
                      }
                      meta={formatThreadDate(
                        cycle.afterVersion?.created_at ??
                          cycle.run.completed_at ??
                          cycle.run.created_at,
                      )}
                      x={workX}
                      y={outputY}
                      width={workWidth}
                      height={standardNodeHeight}
                      onClick={() =>
                        setSelection({
                          type: "version",
                          title: cycle.afterVersion
                            ? versionLabel(cycle.afterVersion, "After Dream")
                            : "Document unchanged",
                          version: cycle.afterVersion ?? cycle.beforeVersion,
                          note: cycle.afterVersion
                            ? "The restorable document version produced by this Dream."
                            : "This Dream added commentary but did not replace the document.",
                          changes: cycle.dreamChanges,
                        })
                      }
                    />
                    <ThreadNode
                      tone="review"
                      icon={MessageSquare}
                      eyebrow="Morning review"
                      title={`${countLabel(cycle.reviewActions, "action")} · ${cycle.openCritiques} open`}
                      detail={
                        cycle.reviewActions
                          ? "Kept, reverted, answered, dismissed, or branched."
                          : "Waiting for a human response."
                      }
                      meta="Feeds the next Dream"
                      x={dreamX}
                      y={outputY}
                      width={dreamWidth}
                      height={standardNodeHeight}
                      status={cycle.reviewActions ? "complete" : "pending"}
                      onClick={() => setSelection({ type: "review", cycle })}
                    />
                  </div>
                );
              })}

              <ThreadNode
                tone="human"
                icon={UserRound}
                eyebrow="Since the last Dream"
                title={`${countLabel(thread.frontier.inputs.length, "input")} waiting`}
                detail={frontierInputSummary}
                meta={`${changeLabel(thread.frontier.humanChanges)} in document`}
                x={humanX}
                y={frontierContributionY}
                width={humanWidth}
                height={contributionHeight}
                status="active"
                onClick={() =>
                  setSelection({
                    type: "inputs",
                    title: "Waiting for the next Dream",
                    inputs: thread.frontier.inputs,
                    changes: thread.frontier.humanChanges,
                  })
                }
              />
              <ThreadNode
                tone="work"
                icon={FileText}
                eyebrow="Current draft"
                title={currentVersionTitle}
                detail="What the next Dream will read, including today’s edits."
                meta={`+${thread.frontier.humanChanges.addedLines} −${thread.frontier.humanChanges.removedLines} lines`}
                x={workX}
                y={frontierCurrentY}
                width={workWidth}
                height={standardNodeHeight}
                status="active"
                onClick={() =>
                  setSelection({
                    type: "version",
                    title: "Current draft",
                    version: thread.frontier.baseVersion,
                    note: "The live canonical document at the edge of the Thread.",
                    changes: thread.frontier.humanChanges,
                  })
                }
              />
              <ThreadNode
                tone="dream"
                icon={thread.frontier.activeRun ? Sparkles : Clock3}
                eyebrow={
                  thread.frontier.activeRun ? "Dreaming now" : "Tonight’s Dream"
                }
                title={
                  thread.frontier.activeRun
                    ? thread.frontier.activeRun.progress_stage
                    : countdownLabel(thread.frontier.nextDreamAt, now)
                }
                detail={
                  thread.frontier.activeRun
                    ? `${thread.frontier.activeRun.progress_percent}% complete`
                    : thread.frontier.inputs.length
                      ? "Will read the waiting inputs overnight."
                      : "Will skip unless something new is added."
                }
                meta={
                  thread.frontier.activeRun
                    ? "Durable workflow running"
                    : formatThreadDate(thread.frontier.nextDreamAt)
                }
                x={dreamX}
                y={frontierDreamY}
                width={dreamWidth}
                height={dreamNodeHeight}
                status={thread.frontier.activeRun ? "active" : "pending"}
                pending={!thread.frontier.activeRun}
                pulse
                nodeRef={desktopFrontierNode}
                onClick={() =>
                  setSelection({ type: "frontier", frontier: thread.frontier })
                }
              />

              <div
                className="absolute flex items-center gap-2 font-mono text-[9px] text-muted-foreground"
                style={{ left: workX + 48, top: canvasHeight - 34 }}
              >
                <ArrowDown className="size-3" />
                Waiting for the next contribution
              </div>
            </div>
          </div>

          <aside
            aria-label="Node inspector"
            className={`${selection ? "block" : "hidden"} ${styles.inspector} max-h-[48vh] min-h-0 overflow-y-auto border-t p-5 lg:absolute lg:inset-y-0 lg:right-0 lg:z-30 lg:max-h-none lg:w-[340px] lg:border-l lg:border-t-0`}
          >
            <div className="mb-5 flex items-center justify-between border-b pb-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Node inspector
              </p>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Close node inspector"
                onClick={() => setSelection(null)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <ThreadInspector
              selection={selection}
              now={now}
              onOpenContext={onOpenContext}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
