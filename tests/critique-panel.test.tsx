// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CritiquePanel } from "@/components/critique-panel";
import type { CritiqueComment } from "@/lib/critiques";
import type { LoopInsight } from "@/lib/domain";

const comments: CritiqueComment[] = [
  {
    commentKey: "protect-claim",
    kind: "strength",
    scope: "passage",
    anchorText: "The claim is concrete.",
    sectionTitle: null,
    comment: "Protect this sentence. It gives the argument a test.",
    suggestedNextStep: null,
  },
  {
    commentKey: "invert-thesis",
    kind: "conjecture",
    scope: "document",
    anchorText: null,
    sectionTitle: null,
    comment: "The counter-case may contain the more original thesis.",
    suggestedNextStep: "Invert the argument for one pass.",
  },
];

const insight: LoopInsight = {
  id: "insight-1",
  loop_run_id: "run-1",
  material_change: true,
  summary: "The thesis is becoming testable.",
  what_changed: [],
  why_it_matters: "The strongest claim can now be challenged.",
  unresolved: [],
  evidence: [],
  proposal: {},
  next_action: "Test the counter-case.",
  thinking_evolution: "",
  change_attribution: {},
  change_details: [],
  reasoning_model: { nodes: [], edges: [] },
  decision_alerts: [],
  critique_comments: comments,
  accepted_at: null,
  created_at: "2026-07-20T05:00:00.000Z",
};

describe("critique panel", () => {
  it("renders positive criticism and broad conjecture as reviewable comments", () => {
    render(
      <CritiquePanel
        comments={comments}
        insight={insight}
        reviews={[]}
        selectedKey="protect-claim"
        projectId="project-1"
        userId="user-1"
        onSelect={vi.fn()}
        onLocate={vi.fn()}
        onReviewSaved={vi.fn()}
      />,
    );

    expect(screen.getByText("Conjecture + criticism")).toBeInTheDocument();
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("Conjecture")).toBeInTheDocument();
    expect(
      screen.getByText("Protect this sentence. It gives the argument a test."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByPlaceholderText(
        "Respond, push back, or add direction for the next Dream",
      ),
    ).toHaveLength(2);
  });
});
