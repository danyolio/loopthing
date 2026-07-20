// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHumanCommentAnchorPlugin,
  humanCommentAnchorPluginKey,
} from "@/lib/human-comment-anchor-plugin";
import {
  createHumanTextCommentAnchor,
  parseHumanComments,
  resolveHumanCommentRanges,
} from "@/lib/human-comments";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("human comment anchors", () => {
  it("highlights selected text, survives a shifted passage, and opens its comment", () => {
    const quote = "The strongest claim is concrete.";
    const onSelect = vi.fn();
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit],
      content: `<p>${quote} It should remain visible.</p>`,
    });
    const anchor = createHumanTextCommentAnchor(
      editor.state.doc,
      1,
      quote.length + 1,
    );
    expect(anchor?.quote).toBe(quote);

    const [comment] = parseHumanComments([
      {
        id: "comment-1",
        body: "Keep this sentence.",
        author_id: "user-1",
        anchor,
        resolved_at: null,
        created_at: "2026-07-20T06:00:00.000Z",
      },
    ]);
    editor.registerPlugin(
      createHumanCommentAnchorPlugin({ comments: [comment], onSelect }),
    );

    expect(
      editor.view.dom.querySelector(".human-comment-anchor"),
    ).toHaveTextContent(quote);
    const marker = editor.view.dom.querySelector<HTMLButtonElement>(
      ".human-comment-marker",
    );
    marker?.click();
    expect(onSelect).toHaveBeenCalledWith("comment-1");

    editor.commands.insertContentAt(1, "New context. ");
    expect(resolveHumanCommentRanges(editor.state.doc, anchor!)).toHaveLength(1);
    expect(
      editor.view.dom.querySelector(".human-comment-anchor"),
    ).toHaveTextContent(quote);

    editor.unregisterPlugin(humanCommentAnchorPluginKey);
    expect(
      editor.view.dom.querySelector(".human-comment-marker"),
    ).not.toBeInTheDocument();
  });

  it("does not render resolved comments as active document marks", () => {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit],
      content: "<p>A commentable sentence.</p>",
    });
    const anchor = createHumanTextCommentAnchor(editor.state.doc, 1, 24);
    const [comment] = parseHumanComments([
      {
        id: "comment-2",
        body: "Already handled.",
        author_id: "user-1",
        anchor,
        resolved_at: "2026-07-20T07:00:00.000Z",
        created_at: "2026-07-20T06:00:00.000Z",
      },
    ]);
    editor.registerPlugin(
      createHumanCommentAnchorPlugin({
        comments: [comment],
        onSelect: vi.fn(),
      }),
    );

    expect(
      editor.view.dom.querySelector(".human-comment-anchor"),
    ).not.toBeInTheDocument();
  });
});
