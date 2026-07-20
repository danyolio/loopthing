"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
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
  PanelRight,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasoningGraph, type GraphEdge, type GraphNode } from "@/components/reasoning-graph";
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

// Keep the three workflow lanes visible beside the inspector on a laptop.
const canvasWidth = 980;
const humanX = 20;
const humanWidth = 260;
const workX = 350;
const workWidth = 240;
const dreamX = 660;
const dreamWidth = 300;
const firstVersionY = 92;
const cycleStep = 326;

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
  pending = false,
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
  pending?: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    human:
      "border-emerald-500/35 bg-emerald-50/95 hover:border-emerald-500/60",
    work: "border-neutral-300 bg-white hover:border-neutral-400",
    dream:
      "border-violet-500/35 bg-violet-50/95 hover:border-violet-500/60",
    review:
      "border-amber-500/30 bg-amber-50/95 hover:border-amber-500/50",
  }[tone];
  const iconClass = {
    human: "bg-emerald-100 text-emerald-800",
    work: "bg-neutral-100 text-neutral-700",
    dream: "bg-violet-100 text-violet-800",
    review: "bg-amber-100 text-amber-800",
  }[tone];

  return (
    <button
      type="button"
      className={`absolute overflow-hidden rounded-xl border text-left shadow-[0_8px_24px_rgba(28,25,23,0.06)] transition ${toneClass} ${pending ? "border-dashed" : ""}`}
      style={{ left: x, top: y, width, height }}
      onClick={onClick}
    >
      <span className="flex h-full flex-col px-3.5 py-3">
        <span className="flex items-start justify-between gap-3">
          <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${iconClass}`}>
            <Icon className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </span>
            <span className="mt-0.5 block truncate text-xs font-semibold leading-5">
              {title}
            </span>
          </span>
          <PanelRight className="mt-1 size-3 shrink-0 text-muted-foreground/60" />
        </span>
        <span className="mt-2 line-clamp-2 block text-[10px] leading-4 text-muted-foreground">
          {detail}
        </span>
        {meta && (
          <span className="mt-auto block truncate pt-1.5 font-mono text-[9px] text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
    </button>
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
  const canvasViewport = useRef<HTMLDivElement>(null);
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
    const viewport = canvasViewport.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, []);

  useEffect(() => {
    const ready = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearTimeout(ready);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (view !== "thread") return;
    const timer = window.setTimeout(jumpToNow, 0);
    return () => window.clearTimeout(timer);
  }, [jumpToNow, thread.cycles.length, view]);

  const frontierBaseY = firstVersionY + thread.cycles.length * cycleStep;
  const canvasHeight = frontierBaseY + 390;
  const frontierMidY = frontierBaseY + 118;
  const currentVersionTitle =
    versionLabel(thread.frontier.baseVersion, "Current project state");
  const frontierInputSummary = thread.frontier.inputs.length
    ? inputBreakdown(thread.frontier.inputs)
        .map(([kind, count]) => `${count} ${kind}`)
        .join(" · ")
    : "No new activity yet";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f7f4]">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Network className="size-4 text-violet-700" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                The Thread
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              See how the work got here.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Versions are the spine. Human work is green. Dream development is purple.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-8 gap-1.5 bg-background px-3">
              <Check className="size-3 text-emerald-700" />
              Opening this view uses 0 model calls
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
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <ThreadMetric value={thread.totals.dreams} label="Dreams" />
          <ThreadMetric value={thread.totals.inputs} label="human inputs" />
          <ThreadMetric value={thread.totals.dreamChanges} label="Dream changes" />
          <ThreadMetric value={thread.totals.critiques} label="Dream comments" />
          <ThreadMetric value={thread.totals.reviewActions} label="review actions" />
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
        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-4">
          <div
            ref={canvasViewport}
            className="min-h-0 flex-1 overflow-auto lg:col-span-3"
          >
            <div
              className="relative mx-auto"
              style={{ width: canvasWidth, height: canvasHeight }}
            >
              <div className="absolute inset-x-0 top-0 grid grid-cols-[260px_240px_300px] gap-[70px] px-5 pt-5">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  <UserRound className="size-3" />
                  Human
                </p>
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
                  <FileText className="size-3" />
                  Work
                </p>
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-800">
                  <Moon className="size-3" />
                  Dream + review
                </p>
              </div>

              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                width={canvasWidth}
                height={canvasHeight}
              >
                <defs>
                  <marker
                    id="thread-arrow-green"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0 L7,3.5 L0,7 z" fill="#4f8f69" />
                  </marker>
                  <marker
                    id="thread-arrow-violet"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0 L7,3.5 L0,7 z" fill="#8b5cf6" />
                  </marker>
                  <marker
                    id="thread-arrow-neutral"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0 L7,3.5 L0,7 z" fill="#a8a29e" />
                  </marker>
                </defs>

                {thread.cycles.map((cycle, index) => {
                  const baseY = firstVersionY + index * cycleStep;
                  const midY = baseY + 118;
                  const outputY = baseY + cycleStep;
                  const reviewY = baseY + 282;
                  const nextHumanY = outputY + 118;
                  return (
                    <g key={`edges:${cycle.id}`}>
                      <path
                        d={`M ${workX + 40} ${baseY + 88} C ${workX - 20} ${baseY + 98}, ${humanX + humanWidth + 70} ${midY + 52}, ${humanX + humanWidth - 8} ${midY + 52}`}
                        fill="none"
                        stroke="#4f8f69"
                        strokeOpacity="0.62"
                        strokeWidth="1.6"
                        markerEnd="url(#thread-arrow-green)"
                      />
                      <path
                        d={`M ${humanX + humanWidth} ${midY + 61} C ${humanX + humanWidth + 35} ${midY + 61}, ${workX - 30} ${midY + 55}, ${workX - 8} ${midY + 55}`}
                        fill="none"
                        stroke="#4f8f69"
                        strokeOpacity="0.68"
                        strokeWidth="1.6"
                        markerEnd="url(#thread-arrow-green)"
                      />
                      <path
                        d={`M ${workX + workWidth} ${midY + 55} C ${workX + workWidth + 35} ${midY + 55}, ${dreamX - 34} ${midY + 72}, ${dreamX - 8} ${midY + 72}`}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeOpacity="0.72"
                        strokeWidth="1.7"
                        markerEnd="url(#thread-arrow-violet)"
                      />
                      <path
                        d={`M ${dreamX + 34} ${midY + 150} C ${dreamX - 10} ${midY + 190}, ${workX + workWidth + 36} ${outputY + 42}, ${workX + workWidth + 8} ${outputY + 42}`}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeOpacity="0.72"
                        strokeWidth="1.7"
                        markerEnd="url(#thread-arrow-violet)"
                      />
                      <path
                        d={`M ${dreamX + dreamWidth / 2} ${midY + 150} L ${dreamX + dreamWidth / 2} ${reviewY - 8}`}
                        fill="none"
                        stroke="#a8a29e"
                        strokeOpacity="0.7"
                        strokeWidth="1.5"
                        markerEnd="url(#thread-arrow-neutral)"
                      />
                      <path
                        d={`M ${dreamX} ${reviewY + 112} C ${dreamX - 120} ${reviewY + 150}, ${humanX + humanWidth + 120} ${nextHumanY + 60}, ${humanX + humanWidth - 8} ${nextHumanY + 60}`}
                        fill="none"
                        stroke="#4f8f69"
                        strokeDasharray="5 5"
                        strokeOpacity="0.42"
                        strokeWidth="1.4"
                        markerEnd="url(#thread-arrow-green)"
                      />
                    </g>
                  );
                })}

                <path
                  d={`M ${workX + 40} ${frontierBaseY + 88} C ${workX - 30} ${frontierBaseY + 100}, ${humanX + humanWidth + 60} ${frontierMidY + 53}, ${humanX + humanWidth - 8} ${frontierMidY + 53}`}
                  fill="none"
                  stroke="#4f8f69"
                  strokeOpacity="0.65"
                  strokeWidth="1.6"
                  markerEnd="url(#thread-arrow-green)"
                />
                <path
                  d={`M ${humanX + humanWidth} ${frontierMidY + 61} C ${humanX + humanWidth + 35} ${frontierMidY + 61}, ${workX - 30} ${frontierMidY + 55}, ${workX - 8} ${frontierMidY + 55}`}
                  fill="none"
                  stroke="#4f8f69"
                  strokeOpacity="0.68"
                  strokeWidth="1.6"
                  markerEnd="url(#thread-arrow-green)"
                />
                <path
                  d={`M ${workX + workWidth} ${frontierMidY + 55} C ${workX + workWidth + 35} ${frontierMidY + 55}, ${dreamX - 34} ${frontierMidY + 72}, ${dreamX - 8} ${frontierMidY + 72}`}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeDasharray={thread.frontier.activeRun ? undefined : "6 6"}
                  strokeOpacity={thread.frontier.activeRun ? 0.78 : 0.5}
                  strokeWidth="1.7"
                  markerEnd="url(#thread-arrow-violet)"
                />
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
                    ? "The recorded state before this visible part of the Thread."
                    : "The project’s current working document."
                }
                meta={formatThreadDate(project.created_at)}
                x={workX}
                y={firstVersionY}
                width={workWidth}
                height={90}
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
                const baseY = firstVersionY + index * cycleStep;
                const midY = baseY + 118;
                const outputY = baseY + cycleStep;
                const reviewY = baseY + 282;
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
                      y={midY}
                      width={humanWidth}
                      height={122}
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
                      y={midY}
                      width={workWidth}
                      height={110}
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
                      y={midY}
                      width={dreamWidth}
                      height={152}
                      onClick={() => setSelection({ type: "dream", cycle })}
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
                      y={reviewY}
                      width={dreamWidth}
                      height={112}
                      onClick={() => setSelection({ type: "review", cycle })}
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
                          ? "A linked, restorable result of the Dream."
                          : "The Dream left criticism without forcing a rewrite."
                      }
                      meta={formatThreadDate(
                        cycle.afterVersion?.created_at ??
                          cycle.run.completed_at ??
                          cycle.run.created_at,
                      )}
                      x={workX}
                      y={outputY}
                      width={workWidth}
                      height={90}
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
                y={frontierMidY}
                width={humanWidth}
                height={122}
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
                y={frontierMidY}
                width={workWidth}
                height={110}
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
                y={frontierMidY}
                width={dreamWidth}
                height={152}
                pending={!thread.frontier.activeRun}
                onClick={() =>
                  setSelection({ type: "frontier", frontier: thread.frontier })
                }
              />

              <div
                className="absolute flex items-center gap-2 text-[10px] text-muted-foreground"
                style={{ left: workX + 96, top: canvasHeight - 46 }}
              >
                <ArrowDown className="size-3" />
                The Thread continues when new work arrives
                <ArrowRight className="size-3" />
              </div>
            </div>
          </div>

          <aside
            className={`${selection ? "block" : "hidden"} max-h-[42vh] min-h-0 overflow-y-auto border-t bg-background p-5 lg:block lg:max-h-none lg:border-l lg:border-t-0`}
          >
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
