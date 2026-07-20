// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReasoningGraph } from "@/components/reasoning-graph";

describe("reasoning graph", () => {
  it("separates human input from Dream reasoning and shows their relation", () => {
    render(
      <ReasoningGraph
        nodes={[
          {
            id: "evidence",
            key: "evidence",
            type: "evidence",
            label: "Readers abandon abstract openings.",
            detail: "Three interviews",
            status: "active",
            confidence: 80,
            origin: "human",
          },
          {
            id: "claim",
            key: "claim",
            type: "claim",
            label: "Start with the concrete example.",
            detail: "",
            status: "active",
            confidence: 70,
            origin: "dream",
          },
        ]}
        edges={[
          {
            id: "edge",
            from: "evidence",
            to: "claim",
            relation: "supports",
            origin: "dream",
          },
        ]}
      />,
    );

    expect(screen.getByText("Inputs")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(screen.getByText("Human")).toBeInTheDocument();
    expect(screen.getByText("Dream")).toBeInTheDocument();
    expect(screen.getByText("supports")).toBeInTheDocument();
  });
});
