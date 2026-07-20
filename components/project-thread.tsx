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

// Time runs downward. Columns only describe who or what acted at each step.
const canvasWidth = 960;
const humanX = 20;
const humanWidth = 270;
const workX = 345;
const workWidth = 270;
const dreamX = 670;
const dreamWidth = 270;
const firstVersionY = 104;
const contributionOffset = 180;
const beforeDreamOffset = 370;
const dreamOffset = 550;
const outputOffset = 782;
const cycleStep = outputOffset;

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
  pending?: boolean;
  pulse?: boolean;
  nodeRef?: Ref<HTMLButtonElement>;
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
      ref={nodeRef}
      type="button"
      className={`absolute overflow-hidden rounded-2xl border text-left shadow-[0_10px_30px_rgba(28,25,23,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(28,25,23,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${toneClass} ${pending ? "border-dashed" : ""} ${pulse ? styles.frontierPulse : ""}`}
      style={{ left: x, top: y, width, height }}
      onClick={onClick}
    >
      <span className="flex h-full flex-col px-4 py-4">
        <span className="flex items-start justify-between gap-3.5">
          <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${iconClass}`}>
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </span>
            <span className="mt-1 block text-sm font-semibold leading-5">
              {title}
            </span>
          </span>
          <PanelRight className="mt-1 size-3 shrink-0 text-muted-foreground/60" />
        </span>
        <span className="mt-2.5 line-clamp-3 block text-xs leading-[1.15rem] text-muted-foreground">
          {detail}
        </span>
        {meta && (
          <span className="mt-auto block truncate pt-2 font-mono text-[10px] text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
    </button>
  );
}

function ThreadFlowPath({
  d,
  tone,
  pending = false,
  delayed = false,
}: {
  d: string;
  tone: "human" | "work" | "dream";
  pending?: boolean;
  delayed?: boolean;
}) {
  const color = {
    human: "#4f8f69",
    work: "#a8a29e",
    dream: "#8b5cf6",
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
        strokeDasharray={pending ? "7 7" : undefined}
        strokeOpacity={pending ? 0.38 : 0.45}
        strokeWidth="1.7"
        markerEnd={marker}
      />
      <path
        d={d}
        fill="none"
        pathLength="100"
        stroke={color}
        strokeOpacity={pending ? 0.5 : 0.9}
        strokeWidth={pending ? "2" : "2.25"}
        className={`${styles.flowPath} ${delayed ? styles.flowPathDelayed : ""}`}
        style={{ color }}
      />
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
    human: "border-emerald-500/35 bg-emerald-50/95",
    work: "border-neutral-300 bg-white",
    dream: "border-violet-500/35 bg-violet-50/95",
    review: "border-amber-500/30 bg-amber-50/95",
  }[tone];
  const iconClass = {
    human: "border-emerald-300 bg-emerald-100 text-emerald-800",
    work: "border-neutral-300 bg-neutral-100 text-neutral-700",
    dream: "border-violet-300 bg-violet-100 text-violet-800",
    review: "border-amber-300 bg-amber-100 text-amber-800",
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
        className={`w-full rounded-2xl border p-4 text-left shadow-[0_10px_26px_rgba(28,25,23,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${toneClass} ${pending ? "border-dashed" : ""} ${pulse ? styles.frontierPulse : ""}`}
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
          <PanelRight className="mt-1 size-3 shrink-0 text-muted-foreground/60" />
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

  const frontierBaseY = firstVersionY + thread.cycles.length * cycleStep;
  const frontierContributionY = frontierBaseY + contributionOffset;
  const frontierCurrentY = frontierBaseY + beforeDreamOffset;
  const frontierDreamY = frontierBaseY + dreamOffset;
  const canvasHeight = frontierDreamY + 250;
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
              Time runs down through human work, Dreams, reviews, and the next
              version.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
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
        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-4 lg:grid-rows-[minmax(0,1fr)]">
          <div className="min-h-0 flex-1 overflow-auto lg:col-span-3">
            <div className="mx-auto max-w-lg px-4 py-6 md:hidden">
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
              className="relative mx-auto hidden md:block"
              data-flow-direction="top-to-bottom"
              role="group"
              aria-label="Project workflow over time"
              style={{ width: canvasWidth, height: canvasHeight }}
            >
              <div className="absolute inset-x-0 top-0 grid grid-cols-[270px_270px_270px] gap-[55px] px-5 pt-5">
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

              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-6 top-16 rounded-[1.75rem] border border-emerald-200/45 bg-emerald-50/35"
                style={{ left: humanX - 12, width: humanWidth + 24 }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-6 top-16 rounded-[1.75rem] border border-neutral-200/70 bg-white/45"
                style={{ left: workX - 12, width: workWidth + 24 }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-6 top-16 rounded-[1.75rem] border border-violet-200/45 bg-violet-50/35"
                style={{ left: dreamX - 12, width: dreamWidth + 24 }}
              />

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
                  const contributionY = baseY + contributionOffset;
                  const beforeY = baseY + beforeDreamOffset;
                  const dreamY = baseY + dreamOffset;
                  const outputY = baseY + cycleStep;
                  const nextContributionY = outputY + contributionOffset;
                  const workCenter = workX + workWidth / 2;
                  const humanCenter = humanX + humanWidth / 2;
                  const dreamCenter = dreamX + dreamWidth / 2;
                  return (
                    <g key={`edges:${cycle.id}`}>
                      <ThreadFlowPath
                        d={`M ${workCenter} ${baseY + 136} C ${workCenter} ${baseY + 150}, ${humanCenter} ${contributionY - 34}, ${humanCenter} ${contributionY - 9}`}
                        tone="human"
                      />
                      <ThreadFlowPath
                        d={`M ${humanCenter} ${contributionY + 150} C ${humanCenter} ${contributionY + 166}, ${workCenter} ${beforeY - 34}, ${workCenter} ${beforeY - 9}`}
                        tone="human"
                        delayed
                      />
                      <ThreadFlowPath
                        d={`M ${workCenter} ${beforeY + 144} C ${workCenter} ${beforeY + 160}, ${dreamCenter} ${dreamY - 34}, ${dreamCenter} ${dreamY - 9}`}
                        tone="dream"
                      />
                      <ThreadFlowPath
                        d={`M ${dreamCenter} ${dreamY + 190} C ${dreamCenter} ${dreamY + 206}, ${workCenter} ${outputY - 34}, ${workCenter} ${outputY - 9}`}
                        tone="dream"
                        delayed
                      />
                      <ThreadFlowPath
                        d={`M ${dreamCenter} ${dreamY + 190} L ${dreamCenter} ${outputY - 9}`}
                        tone="work"
                      />
                      <ThreadFlowPath
                        d={`M ${workCenter} ${outputY + 136} C ${workCenter} ${outputY + 150}, ${humanCenter} ${nextContributionY - 32}, ${humanCenter} ${nextContributionY - 9}`}
                        tone="human"
                      />
                      <ThreadFlowPath
                        d={`M ${dreamCenter} ${outputY + 146} C ${dreamCenter} ${outputY + 158}, ${humanCenter + 72} ${nextContributionY - 26}, ${humanCenter + 22} ${nextContributionY - 8}`}
                        tone="human"
                        pending
                        delayed
                      />
                    </g>
                  );
                })}

                <ThreadFlowPath
                  d={`M ${workX + workWidth / 2} ${frontierBaseY + 136} C ${workX + workWidth / 2} ${frontierBaseY + 150}, ${humanX + humanWidth / 2} ${frontierContributionY - 34}, ${humanX + humanWidth / 2} ${frontierContributionY - 9}`}
                  tone="human"
                />
                <ThreadFlowPath
                  d={`M ${humanX + humanWidth / 2} ${frontierContributionY + 150} C ${humanX + humanWidth / 2} ${frontierContributionY + 166}, ${workX + workWidth / 2} ${frontierCurrentY - 34}, ${workX + workWidth / 2} ${frontierCurrentY - 9}`}
                  tone="human"
                  delayed
                />
                <ThreadFlowPath
                  d={`M ${workX + workWidth / 2} ${frontierCurrentY + 144} C ${workX + workWidth / 2} ${frontierCurrentY + 160}, ${dreamX + dreamWidth / 2} ${frontierDreamY - 34}, ${dreamX + dreamWidth / 2} ${frontierDreamY - 9}`}
                  tone="dream"
                  pending={!thread.frontier.activeRun}
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
                height={136}
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
                const contributionY = baseY + contributionOffset;
                const beforeY = baseY + beforeDreamOffset;
                const dreamY = baseY + dreamOffset;
                const outputY = baseY + cycleStep;
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
                    <div
                      className="absolute flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                      style={{ left: humanX, top: contributionY - 31 }}
                    >
                      <span className="inline-flex size-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-[9px] text-emerald-800">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      Dream cycle · {formatThreadDate(cycle.run.created_at)}
                    </div>
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
                      height={150}
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
                      height={144}
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
                      height={190}
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
                      y={outputY}
                      width={dreamWidth}
                      height={146}
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
                      height={136}
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

              <div
                className="absolute flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-violet-800"
                style={{ left: humanX, top: frontierContributionY - 31 }}
              >
                <span className="inline-flex h-5 items-center rounded-full border border-violet-300 bg-violet-50 px-2 text-[9px]">
                  Now
                </span>
                Current activity
              </div>
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
                height={150}
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
                height={144}
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
                height={190}
                pending={!thread.frontier.activeRun}
                pulse
                nodeRef={desktopFrontierNode}
                onClick={() =>
                  setSelection({ type: "frontier", frontier: thread.frontier })
                }
              />

              <div
                className="absolute flex items-center gap-2 text-[10px] text-muted-foreground"
                style={{ left: workX + 78, top: canvasHeight - 48 }}
              >
                <ArrowDown className="size-3" />
                The Thread continues when new work arrives
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
