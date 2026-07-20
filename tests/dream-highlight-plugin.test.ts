// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDreamHighlightPlugin,
  dreamHighlightPluginKey,
} from "@/lib/dream-highlight-plugin";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("document change highlighting", () => {
  it("distinguishes Dream changes from later human additions", () => {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit],
      content:
        "<h1>Thesis</h1><p>Keep this.</p><p>Open with a concrete example.</p><p>A human follow-up.</p>",
    });
    editor.registerPlugin(
      createDreamHighlightPlugin({
        before: "Thesis\n\nKeep this.\n\nAn abstract opening.",
        after: "Thesis\n\nKeep this.\n\nOpen with a concrete example.",
      }),
    );

    const highlighted = editor.view.dom.querySelectorAll(
      ".dream-change-highlight",
    );
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toHaveTextContent("Open with a concrete example.");
    const humanHighlighted = editor.view.dom.querySelectorAll(
      ".human-change-highlight",
    );
    expect(humanHighlighted).toHaveLength(1);
    expect(humanHighlighted[0]).toHaveTextContent("A human follow-up.");

    editor.unregisterPlugin(dreamHighlightPluginKey);
    expect(
      editor.view.dom.querySelectorAll(".dream-change-highlight"),
    ).toHaveLength(0);
    expect(
      editor.view.dom.querySelectorAll(".human-change-highlight"),
    ).toHaveLength(0);
  });
});
