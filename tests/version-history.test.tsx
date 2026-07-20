// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VersionHistory } from "@/components/version-history";
import type { LoopInsight, ThinkingItem } from "@/lib/domain";

const before: ThinkingItem = {
  id: "before-version",
  created_at: "2026-07-19T11:57:50.000Z",
  checkpoint_id: "checkpoint-42",
  loop_run_id: "dream-run",
  source: "pre_dream",
  label: "Before Dream",
  plain_text: "Keep the thesis.\nThe opening is abstract.",
};

const after: ThinkingItem = {
  id: "after-version",
  created_at: "2026-07-19T11:57:51.000Z",
  checkpoint_id: "checkpoint-43",
  loop_run_id: "dream-run",
  insight_id: "dream-insight",
  base_version_id: "before-version",
  source: "dream",
  label: "Overnight Dream",
  plain_text: "Keep the thesis.\nOpen with a concrete example.",
};

const insight: LoopInsight = {
  id: "dream-insight",
  loop_run_id: "dream-run",
  material_change: true,
  summary: "The opening is now concrete.",
  what_changed: ["Replaced the abstract opening."],
  why_it_matters: "Readers can enter the argument sooner.",
  unresolved: [],
  evidence: [],
  proposal: {},
  next_action: "Find a modern strategic example.",
  thinking_evolution: "",
  change_attribution: {
    directives: ["Make the opening concrete."],
    independent: ["Moved the thesis ahead of the background."],
    preserved: ["Kept the central incubation argument."],
  },
  change_details: [],
  reasoning_model: { nodes: [], edges: [] },
  decision_alerts: [],
  accepted_at: "2026-07-19T11:57:51.000Z",
  created_at: "2026-07-19T11:57:51.000Z",
};

describe("Dream version history", () => {
  it("shows the paired versions, attribution, diff, and restoration controls", () => {
    const onRestore = vi.fn();
    render(
      <VersionHistory
        versions={[after, before]}
        insights={[insight]}
        currentCheckpointId="checkpoint-43"
        editable
        onRestore={onRestore}
      />,
    );

    expect(screen.getByText("Before Dream")).toBeInTheDocument();
    expect(screen.getByText("After Dream")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /review overnight changes/i }),
    );

    expect(screen.getByText("Directed by you")).toBeInTheDocument();
    expect(screen.getByText("Developed by Loopthing")).toBeInTheDocument();
    expect(screen.getByText("Held steady")).toBeInTheDocument();
    expect(screen.getByText("What comes next")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "+1 −1 lines"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: /restore as a new version/i })[0],
    );
    expect(onRestore).toHaveBeenCalledWith(before);
  });
});
