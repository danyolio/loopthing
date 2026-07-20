// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HumanCommentsPanel } from "@/components/human-comments-panel";
import { parseHumanComments } from "@/lib/human-comments";

const comments = parseHumanComments([
  {
    id: "comment-1",
    body: "This claim needs evidence.",
    author_id: "user-1",
    anchor: {
      kind: "text_comment",
      quote: "The market is already moving.",
      prefix: "",
      suffix: "",
      from: 4,
      to: 33,
    },
    resolved_at: null,
    created_at: "2026-07-20T06:00:00.000Z",
  },
  {
    id: "comment-2",
    body: "A broader note for the project.",
    author_id: "user-2",
    anchor: {},
    resolved_at: "2026-07-20T07:00:00.000Z",
    created_at: "2026-07-20T06:00:00.000Z",
  },
]);

describe("human comments panel", () => {
  it("separates anchored comments from broad notes and exposes review actions", () => {
    const onLocate = vi.fn();
    const onResolve = vi.fn();
    render(
      <HumanCommentsPanel
        comments={comments}
        selectedId="comment-1"
        userId="user-1"
        isOwner={false}
        onSelect={vi.fn()}
        onLocate={onLocate}
        onResolve={onResolve}
      />,
    );

    expect(screen.getByText("On this text")).toBeInTheDocument();
    expect(screen.getByText("Project note")).toBeInTheDocument();
    expect(
      screen.getByText(/The market is already moving\./),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Locate" }));
    expect(onLocate).toHaveBeenCalledWith("comment-1");
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onResolve).toHaveBeenCalledWith(comments[0], true);
  });
});
