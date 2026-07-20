import { describe, expect, it } from "vitest";
import type {
  CritiqueReview,
  DreamChangeReview,
  LoopInsight,
  LoopRun,
  ThinkingItem,
} from "@/lib/domain";
import {
  countThreadChanges,
  deriveProjectThread,
} from "@/lib/project-thread";

const run: LoopRun = {
  id: "dream-run",
  project_id: "project",
  loop_type: "daily",
  status: "complete",
  is_dream: true,
  progress_stage: "Complete",
  progress_percent: 100,
  provider: "google",
  model: "gemini-test",
  error_message: null,
  created_at: "2026-07-19T17:00:00.000Z",
  completed_at: "2026-07-19T17:02:00.000Z",
};

const before: ThinkingItem = {
  id: "before",
  created_at: "2026-07-19T17:00:00.000Z",
  checkpoint_id: "checkpoint-before",
  loop_run_id: run.id,
  source: "pre_dream",
  label: "Before Dream",
  plain_text: "Thesis\n\nThe opening is abstract.",
};

const after: ThinkingItem = {
  id: "after",
  created_at: "2026-07-19T17:02:00.000Z",
  checkpoint_id: "checkpoint-after",
  loop_run_id: run.id,
  insight_id: "insight",
  base_version_id: before.id,
  source: "dream",
  label: "After Dream",
  plain_text: "Thesis\n\nOpen with a concrete example.",
};

const insight: LoopInsight = {
  id: "insight",
  loop_run_id: run.id,
  material_change: true,
  summary: "The opening became concrete.",
  what_changed: ["Rewrote the opening."],
  why_it_matters: "The reader can enter the argument.",
  unresolved: [],
  evidence: [],
  proposal: {},
  next_action: "Test the opening.",
  thinking_evolution: "",
  change_attribution: {},
  change_details: [
    {
      afterExcerpt: "Open with",
      reason: "Use the supplied interview.",
      provenance: "human_direction",
      sourceIds: ["source-1"],
    },
  ],
  reasoning_model: {},
  decision_alerts: [],
  critique_comments: [
    {
      commentKey: "opening",
      kind: "strength",
      scope: "passage",
      anchorText: "Open with a concrete example.",
      sectionTitle: null,
      comment: "This gives the reader somewhere to stand.",
      suggestedNextStep: null,
    },
  ],
  accepted_at: "2026-07-19T17:02:00.000Z",
  created_at: "2026-07-19T17:02:00.000Z",
};

const dreamReview: DreamChangeReview = {
  id: "dream-review",
  project_id: "project",
  dream_version_id: after.id,
  block_key: "changed:1:1",
  before_text: "The opening is abstract.",
  after_text: "Open with a concrete example.",
  status: "kept",
  note: "",
  reviewed_by: "user",
  created_at: "2026-07-20T00:00:00.000Z",
};

const critiqueReview: CritiqueReview = {
  id: "critique-review",
  project_id: "project",
  loop_insight_id: insight.id,
  comment_key: "opening",
  status: "resolved",
  response: "Keep it.",
  reviewed_by: "user",
  reviewed_at: "2026-07-20T00:00:00.000Z",
  created_at: "2026-07-20T00:00:00.000Z",
};

describe("deterministic project Thread", () => {
  it("counts exact block and line changes without generated interpretation", () => {
    expect(
      countThreadChanges(
        "Keep this.\nRewrite this.",
        "Keep this.\nRewritten.",
      ),
    ).toEqual({
      blocks: 1,
      addedLines: 1,
      removedLines: 1,
      lineChanges: 2,
    });
  });

  it("joins versions, inputs, Dream output, and reviews into one lineage", () => {
    const thread = deriveProjectThread({
      projectCreatedAt: "2026-07-19T00:00:00.000Z",
      nextDreamAt: "2026-07-20T17:00:00.000Z",
      currentCheckpointId: after.checkpoint_id as string,
      currentDocumentText:
        "Thesis\n\nOpen with a concrete example.\n\nA human follow-up.",
      versions: [after, before],
      runs: [run],
      insights: [insight],
      dreamChangeReviews: [dreamReview],
      critiqueReviews: [critiqueReview],
      sources: [
        {
          id: "source-1",
          created_at: "2026-07-19T10:00:00.000Z",
          title: "Reader interview",
        },
      ],
      questions: [],
      decisions: [],
      comments: [],
      branches: [],
    });

    expect(thread.cycles).toHaveLength(1);
    expect(thread.cycles[0].beforeVersion?.id).toBe(before.id);
    expect(thread.cycles[0].afterVersion?.id).toBe(after.id);
    expect(thread.cycles[0].dreamChanges).toMatchObject({
      blocks: 1,
      addedLines: 1,
      removedLines: 1,
    });
    expect(
      thread.cycles[0].inputs.find((input) => input.id === "source-1"),
    ).toMatchObject({
      kind: "source",
      referencedByDream: true,
    });
    expect(thread.cycles[0].reviewActions).toBe(2);
    expect(thread.cycles[0].openCritiques).toBe(0);
    expect(thread.frontier.humanChanges.blocks).toBe(1);
    expect(thread.frontier.inputs[0]).toMatchObject({
      kind: "document",
      title: "Document edited",
    });
  });
});
