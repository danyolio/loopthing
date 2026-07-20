// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DreamChangeNotice } from "@/components/dream-change-notice";

describe("Dream change notice", () => {
  it("explains the highlights and exposes both review controls", () => {
    const onToggleHighlights = vi.fn();
    const onOpenVersions = vi.fn();

    render(
      <DreamChangeNotice
        changedSections={3}
        highlightsVisible
        onToggleHighlights={onToggleHighlights}
        onOpenVersions={onOpenVersions}
      />,
    );

    expect(
      screen.getByText(/3 sections changed.*highlighted in the document/i),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /hide highlights/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /open versions/i }));

    expect(onToggleHighlights).toHaveBeenCalledOnce();
    expect(onOpenVersions).toHaveBeenCalledOnce();
  });
});
