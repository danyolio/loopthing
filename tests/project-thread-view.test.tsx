// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectThread } from "@/components/project-thread";
import type { LoopInsight, LoopRun, Project, ThinkingItem } from "@/lib/domain";

const project: Project = {
  id: "project",
  owner_id: "owner",
  title: "Original work",
  description: "",
  status: "active",
  ai_provider: "google",
  next_daily_loop_at: "2026-07-21T17:00:00.000Z",
  next_weekly_loop_at: "2026-07-25T17:00:00.000Z",
  created_at: "2026-07-19T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

const run: LoopRun = {
  id: "run",
  project_id: project.id,
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
  created_at: run.created_at,
  checkpoint_id: "before-checkpoint",
  loop_run_id: run.id,
  source: "pre_dream",
  label: "Before Dream",
  plain_text: "An abstract opening.",
};

const after: ThinkingItem = {
  id: "after",
  created_at: run.completed_at!,
  checkpoint_id: "after-checkpoint",
  loop_run_id: run.id,
  insight_id: "insight",
  base_version_id: before.id,
  source: "dream",
  label: "After Dream",
  plain_text: "A concrete opening.",
};

const insight: LoopInsight = {
  id: "insight",
  loop_run_id: run.id,
  material_change: true,
  summary: "The opening became concrete.",
  what_changed: [],
  why_it_matters: "",
  unresolved: [],
  evidence: [],
  proposal: {},
  next_action: "Test it.",
  thinking_evolution: "",
  change_attribution: {},
  change_details: [],
  reasoning_model: { nodes: [], edges: [] },
  decision_alerts: [],
  critique_comments: [
    {
      commentKey: "opening",
      kind: "strength",
      scope: "passage",
      anchorText: "A concrete opening.",
      sectionTitle: null,
      comment: "Protect this.",
      suggestedNextStep: null,
    },
  ],
  accepted_at: run.completed_at,
  created_at: run.completed_at!,
};

describe("Project Thread view", () => {
  it("renders the workflow graph and explains its deterministic cost", () => {
    render(
      <ProjectThread
        project={project}
        currentCheckpointId="after-checkpoint"
        currentDocumentText="A concrete opening."
        versions={[after, before]}
        runs={[run]}
        insights={[insight]}
        sources={[
          {
            id: "source",
            created_at: "2026-07-19T10:00:00.000Z",
            title: "Interview",
          },
        ]}
        questions={[]}
        decisions={[]}
        comments={[]}
        branches={[]}
        dreamChangeReviews={[]}
        critiqueReviews={[]}
        reasoningNodes={[]}
        reasoningEdges={[]}
        onOpenContext={vi.fn()}
      />,
    );

    expect(screen.getByText("See how the work got here.")).toBeInTheDocument();
    expect(screen.getByText("0 model calls")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Project workflow over time" }),
    ).toHaveAttribute("data-flow-direction", "top-to-bottom");
    expect(screen.getAllByText("Document state").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Current cycle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Before Dream").length).toBeGreaterThan(0);
    expect(screen.getAllByText("After Dream").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tonight’s Dream").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getAllByRole("button", {
        name: /the opening became concrete/i,
      })[0],
    );
    expect(screen.getByText("Deterministic diff")).toBeInTheDocument();
    expect(
      screen.getByText("Computed from the linked Before and After versions. No model call."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Close node inspector" }),
    );
    expect(
      screen.queryByText("Deterministic diff"),
    ).not.toBeInTheDocument();
  });
});
