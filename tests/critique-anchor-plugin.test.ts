// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCritiqueAnchorPlugin,
  critiqueAnchorPluginKey,
} from "@/lib/critique-anchor-plugin";
import type { CritiqueComment } from "@/lib/critiques";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

const comments: CritiqueComment[] = [
  {
    commentKey: "opening-strength",
    kind: "strength",
    scope: "passage",
    anchorText: "The strongest claim is concrete.",
    sectionTitle: "Current thesis",
    comment: "Protect this. It gives the argument a testable centre.",
    suggestedNextStep: null,
  },
  {
    commentKey: "thesis-tension",
    kind: "tension",
    scope: "section",
    anchorText: null,
    sectionTitle: "Current thesis",
    comment: "The evidence below pulls against this framing.",
    suggestedNextStep: null,
  },
  {
    commentKey: "document-question",
    kind: "question",
    scope: "document",
    anchorText: null,
    sectionTitle: null,
    comment: "What would change the conclusion?",
    suggestedNextStep: null,
  },
];

describe("AI critique anchors", () => {
  it("embeds passage and section markers but keeps broad critique in the rail", () => {
    const onSelect = vi.fn();
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit],
      content:
        "<h2>Current thesis</h2><p>The strongest claim is concrete.</p>",
    });
    editor.registerPlugin(createCritiqueAnchorPlugin({ comments, onSelect }));

    expect(
      editor.view.dom.querySelectorAll(".ai-critique-passage-anchor"),
    ).toHaveLength(1);
    expect(
      editor.view.dom.querySelectorAll(".ai-critique-section-anchor"),
    ).toHaveLength(1);
    const markers =
      editor.view.dom.querySelectorAll<HTMLButtonElement>(".ai-critique-marker");
    expect(markers).toHaveLength(2);

    markers[0].click();
    expect(onSelect).toHaveBeenCalledWith("thesis-tension");

    editor.unregisterPlugin(critiqueAnchorPluginKey);
    expect(
      editor.view.dom.querySelectorAll(".ai-critique-marker"),
    ).toHaveLength(0);
  });
});
