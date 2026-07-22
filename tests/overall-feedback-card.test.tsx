// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverallFeedbackCard } from "@/components/overall-feedback-card";
import type { LoopInsight } from "@/lib/domain";

vi.mock("@/components/ai-elements/message", () => ({
  MessageResponse: ({ children }: { children: string }) => <div>{children}</div>,
}));

const insight: LoopInsight = {
  id: "insight-1",
  loop_run_id: "run-1",
  material_change: true,
  summary: "The central claim is now concrete enough to test.",
  what_changed: [],
  why_it_matters: "The second section still assumes the conclusion.",
  unresolved: [],
  evidence: [],
  proposal: {},
  next_action: "Write the strongest counter-case before revising.",
  thinking_evolution: "",
  change_attribution: {},
  change_details: [],
  reasoning_model: { nodes: [], edges: [] },
  decision_alerts: [],
  critique_comments: [
    {
      commentKey: "whole-draft",
      kind: "critique",
      scope: "document",
      anchorText: null,
      sectionTitle: null,
      comment: "The argument is strongest when it stays close to the evidence.",
      suggestedNextStep: null,
    },
  ],
  accepted_at: null,
  created_at: "2026-07-22T00:00:00.000Z",
};

describe("overall feedback card", () => {
  it("headlines the broad editorial read and routes to specific comments", () => {
    const onOpenCritique = vi.fn();
    render(
      <OverallFeedbackCard
        insight={insight}
        onOpenCritique={onOpenCritique}
        onOpenLoop={vi.fn()}
      />,
    );

    expect(screen.getByText("Overall feedback")).toBeInTheDocument();
    expect(
      screen.getByText("The central claim is now concrete enough to test."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The argument is strongest when it stays close to the evidence.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Write the strongest counter-case before revising."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1 specific note" }));
    expect(onOpenCritique).toHaveBeenCalledOnce();
  });
});
