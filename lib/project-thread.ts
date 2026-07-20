import type {
  CritiqueReview,
  DreamChangeReview,
  LoopInsight,
  LoopRun,
  ThinkingItem,
} from "@/lib/domain";
import { parseCritiqueComments, type CritiqueComment } from "@/lib/critiques";
import { dreamBlockChanges } from "@/lib/dream-highlights";
import { diffTextByLine } from "@/lib/text-diff";

export type ThreadInputKind =
  | "document"
  | "source"
  | "question"
  | "decision"
  | "comment"
  | "branch";

export type ThreadChangeCount = {
  blocks: number;
  addedLines: number;
  removedLines: number;
  lineChanges: number;
};

export type ThreadInput = {
  id: string;
  kind: ThreadInputKind;
  title: string;
  detail: string;
  createdAt: string;
  referencedByDream: boolean;
};

export type ThreadCycle = {
  id: string;
  run: LoopRun;
  insight: LoopInsight | undefined;
  beforeVersion: ThinkingItem | undefined;
  afterVersion: ThinkingItem | undefined;
  baseVersion: ThinkingItem | undefined;
  inputs: ThreadInput[];
  humanChanges: ThreadChangeCount;
  dreamChanges: ThreadChangeCount;
  critiques: CritiqueComment[];
  changeDetails: Record<string, unknown>[];
  dreamReviews: DreamChangeReview[];
  critiqueReviews: CritiqueReview[];
  reviewActions: number;
  openCritiques: number;
  inputWindowStart: string;
  inputWindowEnd: string;
};

export type ThreadFrontier = {
  baseVersion: ThinkingItem | undefined;
  inputs: ThreadInput[];
  humanChanges: ThreadChangeCount;
  activeRun: LoopRun | undefined;
  nextDreamAt: string;
  inputWindowStart: string;
};

export type ProjectThread = {
  cycles: ThreadCycle[];
  frontier: ThreadFrontier;
  totals: {
    dreams: number;
    inputs: number;
    dreamChanges: number;
    critiques: number;
    reviewActions: number;
  };
};

type ThreadCollections = {
  sources: ThinkingItem[];
  questions: ThinkingItem[];
  decisions: ThinkingItem[];
  comments: ThinkingItem[];
  branches: ThinkingItem[];
};

type DeriveProjectThreadInput = ThreadCollections & {
  projectCreatedAt: string;
  nextDreamAt: string;
  currentCheckpointId: string | null;
  currentDocumentText: string;
  versions: ThinkingItem[];
  runs: LoopRun[];
  insights: LoopInsight[];
  dreamChangeReviews: DreamChangeReview[];
  critiqueReviews: CritiqueReview[];
};

const inputDefinitions: Array<{
  collection: keyof ThreadCollections;
  kind: Exclude<ThreadInputKind, "document">;
  titleKeys: string[];
  detailKeys: string[];
}> = [
  {
    collection: "sources",
    kind: "source",
    titleKeys: ["title", "url"],
    detailKeys: ["excerpt", "notes", "url"],
  },
  {
    collection: "questions",
    kind: "question",
    titleKeys: ["prompt", "question"],
    detailKeys: ["notes", "status"],
  },
  {
    collection: "decisions",
    kind: "decision",
    titleKeys: ["statement", "title"],
    detailKeys: ["rationale", "status"],
  },
  {
    collection: "comments",
    kind: "comment",
    titleKeys: ["body"],
    detailKeys: [],
  },
  {
    collection: "branches",
    kind: "branch",
    titleKeys: ["title"],
    detailKeys: ["rationale", "status"],
  },
];

function textOf(item: ThinkingItem | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function timestampOf(item: ThinkingItem) {
  return textOf(item, "updated_at", "created_at") || item.created_at;
}

function validTime(value: string, fallback = 0) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inWindow(item: ThinkingItem, start: string, end: string) {
  const timestamp = validTime(timestampOf(item));
  return timestamp > validTime(start) && timestamp <= validTime(end, Infinity);
}

function nonEmptyLineCount(value: string) {
  if (!value) return 0;
  return value.replaceAll("\r\n", "\n").split("\n").length;
}

export function countThreadChanges(
  before: string,
  after: string,
): ThreadChangeCount {
  if (before === after) {
    return { blocks: 0, addedLines: 0, removedLines: 0, lineChanges: 0 };
  }

  const lineDiff = !before
    ? {
        added: nonEmptyLineCount(after),
        removed: 0,
      }
    : !after
      ? {
          added: 0,
          removed: nonEmptyLineCount(before),
        }
      : diffTextByLine(before, after);
  const blocks = dreamBlockChanges(before, after).length;

  return {
    blocks,
    addedLines: lineDiff.added,
    removedLines: lineDiff.removed,
    lineChanges: lineDiff.added + lineDiff.removed,
  };
}

function referencedSourceIds(insight: LoopInsight | undefined) {
  const ids = new Set<string>();
  if (!Array.isArray(insight?.change_details)) return ids;

  for (const value of insight.change_details) {
    if (!value || typeof value !== "object") continue;
    const detail = value as Record<string, unknown>;
    if (!Array.isArray(detail.sourceIds)) continue;
    for (const id of detail.sourceIds) {
      if (typeof id === "string") ids.add(id);
    }
  }

  return ids;
}

function documentInput(
  id: string,
  createdAt: string,
  changes: ThreadChangeCount,
): ThreadInput | null {
  if (!changes.lineChanges && !changes.blocks) return null;
  return {
    id,
    kind: "document",
    title: "Document edited",
    detail: `${changes.blocks} ${changes.blocks === 1 ? "passage" : "passages"} · +${changes.addedLines} −${changes.removedLines} lines`,
    createdAt,
    referencedByDream: true,
  };
}

function inputsForWindow(
  collections: ThreadCollections,
  start: string,
  end: string,
  referencedIds: Set<string>,
  documentChanges?: {
    id: string;
    createdAt: string;
    changes: ThreadChangeCount;
  },
) {
  const inputs = inputDefinitions.flatMap((definition) =>
    collections[definition.collection]
      .filter((item) => inWindow(item, start, end))
      .map((item) => ({
        id: item.id,
        kind: definition.kind,
        title:
          textOf(item, ...definition.titleKeys) ||
          `${definition.kind[0].toUpperCase()}${definition.kind.slice(1)}`,
        detail: textOf(item, ...definition.detailKeys),
        createdAt: timestampOf(item),
        referencedByDream: referencedIds.has(item.id),
      })),
  );
  const edited = documentChanges
    ? documentInput(
        documentChanges.id,
        documentChanges.createdAt,
        documentChanges.changes,
      )
    : null;

  return [...(edited ? [edited] : []), ...inputs].sort(
    (left, right) =>
      validTime(left.createdAt) - validTime(right.createdAt),
  );
}

function changeDetailsOf(insight: LoopInsight | undefined) {
  if (!Array.isArray(insight?.change_details)) return [];
  return insight.change_details.filter(
    (value): value is Record<string, unknown> =>
      Boolean(value) && typeof value === "object",
  );
}

function versionText(version: ThinkingItem | undefined) {
  return textOf(version, "plain_text");
}

function latestVersion(
  versions: ThinkingItem[],
  currentCheckpointId: string | null,
) {
  return (
    versions.find(
      (version) =>
        currentCheckpointId &&
        textOf(version, "checkpoint_id") === currentCheckpointId,
    ) ??
    [...versions].sort(
      (left, right) =>
        validTime(right.created_at) - validTime(left.created_at),
    )[0]
  );
}

export function deriveProjectThread({
  projectCreatedAt,
  nextDreamAt,
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
}: DeriveProjectThreadInput): ProjectThread {
  const collections = { sources, questions, decisions, comments, branches };
  const insightByRun = new Map(
    insights.map((insight) => [insight.loop_run_id, insight]),
  );
  const versionById = new Map(
    versions.map((version) => [version.id, version]),
  );
  const beforeByRun = new Map(
    versions
      .filter((version) => textOf(version, "source") === "pre_dream")
      .map((version) => [textOf(version, "loop_run_id"), version]),
  );
  const afterByRun = new Map(
    versions
      .filter((version) => textOf(version, "source") === "dream")
      .map((version) => [textOf(version, "loop_run_id"), version]),
  );
  const dreamRuns = runs
    .filter((run) => run.is_dream)
    .sort(
      (left, right) =>
        validTime(left.created_at) - validTime(right.created_at),
    );

  let previousWindowStart = projectCreatedAt;
  let previousWorkVersion: ThinkingItem | undefined;
  let previousWorkText = "";
  const cycles = dreamRuns.flatMap((run): ThreadCycle[] => {
    const insight = insightByRun.get(run.id);
    const afterVersion = afterByRun.get(run.id);
    const beforeVersion =
      beforeByRun.get(run.id) ??
      versionById.get(textOf(afterVersion, "base_version_id"));
    const runEnd = run.completed_at || run.created_at;
    const beforeText = versionText(beforeVersion) || previousWorkText;
    const afterText = versionText(afterVersion) || beforeText;
    const humanChanges = countThreadChanges(previousWorkText, beforeText);
    const dreamChanges = countThreadChanges(beforeText, afterText);
    const referencedIds = referencedSourceIds(insight);
    const cycleInputs = inputsForWindow(
      collections,
      previousWindowStart,
      run.created_at,
      referencedIds,
      {
        id: `document:${run.id}`,
        createdAt: run.created_at,
        changes: humanChanges,
      },
    );
    const critiques = parseCritiqueComments(insight?.critique_comments);
    const cycleDreamReviews = afterVersion
      ? dreamChangeReviews.filter(
          (review) => review.dream_version_id === afterVersion.id,
        )
      : [];
    const cycleCritiqueReviews = insight
      ? critiqueReviews.filter(
          (review) => review.loop_insight_id === insight.id,
        )
      : [];
    const reviewByComment = new Map(
      cycleCritiqueReviews.map((review) => [review.comment_key, review]),
    );
    const openCritiques = critiques.filter((critique) => {
      const review = reviewByComment.get(critique.commentKey);
      return !review || review.status === "open";
    }).length;
    const reviewActions =
      cycleDreamReviews.length +
      cycleCritiqueReviews.filter(
        (review) => review.status !== "open" || Boolean(review.response.trim()),
      ).length;
    const cycle: ThreadCycle = {
      id: run.id,
      run,
      insight,
      beforeVersion,
      afterVersion,
      baseVersion: previousWorkVersion,
      inputs: cycleInputs,
      humanChanges,
      dreamChanges,
      critiques,
      changeDetails: changeDetailsOf(insight),
      dreamReviews: cycleDreamReviews,
      critiqueReviews: cycleCritiqueReviews,
      reviewActions,
      openCritiques,
      inputWindowStart: previousWindowStart,
      inputWindowEnd: run.created_at,
    };

    if (run.status === "complete") {
      previousWindowStart = runEnd;
      previousWorkVersion = afterVersion ?? beforeVersion ?? previousWorkVersion;
      previousWorkText = afterText;
    }
    return [cycle];
  });

  const currentVersion =
    latestVersion(versions, currentCheckpointId) ?? previousWorkVersion;
  const frontierBaseline =
    previousWorkText || versionText(currentVersion);
  const frontierChanges = countThreadChanges(
    frontierBaseline,
    currentDocumentText,
  );
  const frontierEnd = "9999-12-31T23:59:59.999Z";
  const frontierInputs = inputsForWindow(
    collections,
    previousWindowStart,
    frontierEnd,
    new Set(),
    {
      id: "document:frontier",
      createdAt: frontierEnd,
      changes: frontierChanges,
    },
  );
  const activeRun = [...runs]
    .sort(
      (left, right) =>
        validTime(right.created_at) - validTime(left.created_at),
    )
    .find((run) => run.status !== "complete" && run.status !== "failed");
  const frontier: ThreadFrontier = {
    baseVersion: currentVersion,
    inputs: frontierInputs,
    humanChanges: frontierChanges,
    activeRun,
    nextDreamAt,
    inputWindowStart: previousWindowStart,
  };

  return {
    cycles,
    frontier,
    totals: {
      dreams: cycles.length,
      inputs:
        cycles.reduce((total, cycle) => total + cycle.inputs.length, 0) +
        frontier.inputs.length,
      dreamChanges: cycles.reduce(
        (total, cycle) => total + cycle.dreamChanges.blocks,
        0,
      ),
      critiques: cycles.reduce(
        (total, cycle) => total + cycle.critiques.length,
        0,
      ),
      reviewActions: cycles.reduce(
        (total, cycle) => total + cycle.reviewActions,
        0,
      ),
    },
  };
}
