// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import type { Editor } from "@tiptap/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeletedMaterialTray } from "@/components/deleted-material-tray";

describe("deleted material tray", () => {
  it("redlines material removed or rewritten after the latest Dream", () => {
    const editor = {
      getText: vi.fn(() => "Thesis\n\nA new human paragraph."),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Editor;

    render(
      <DeletedMaterialTray
        editor={editor}
        dreamAfter={"Thesis\n\nAn old paragraph.\n\nDelete this."}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Removed since the last Dream",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("An old paragraph.").tagName).toBe("DEL");
    expect(screen.getByText("Delete this.").tagName).toBe("DEL");
    expect(editor.on).toHaveBeenCalledWith("update", expect.any(Function));
  });
});
