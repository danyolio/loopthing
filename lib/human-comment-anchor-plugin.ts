import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { HumanComment } from "@/lib/human-comments";
import { resolveHumanCommentRanges } from "@/lib/human-comments";

export const humanCommentAnchorPluginKey = new PluginKey<DecorationSet>(
  "human-comment-anchors",
);

function marker(comment: HumanComment, onSelect: (id: string) => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "human-comment-marker";
  button.dataset.humanCommentId = comment.id;
  button.setAttribute("aria-label", "Open human comment");
  button.title = "Open comment";
  button.contentEditable = "false";
  button.textContent = "●";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(comment.id);
  });
  return button;
}

export function createHumanCommentAnchorPlugin({
  comments,
  onSelect,
}: {
  comments: HumanComment[];
  onSelect: (id: string) => void;
}) {
  function buildDecorations(doc: Parameters<typeof DecorationSet.create>[0]) {
    const decorations = comments.flatMap((comment) => {
      if (!comment.anchor || comment.resolvedAt) return [];
      const ranges = resolveHumanCommentRanges(doc, comment.anchor);
      if (!ranges.length) return [];

      return [
        ...ranges.map(({ from, to }) =>
          Decoration.inline(from, to, {
            class: "human-comment-anchor",
            "data-human-comment-anchor": comment.id,
          }),
        ),
        Decoration.widget(
          ranges[ranges.length - 1].to,
          () => marker(comment, onSelect),
          { key: `human-comment-marker:${comment.id}`, side: 1 },
        ),
      ];
    });

    return DecorationSet.create(doc, decorations);
  }

  return new Plugin({
    key: humanCommentAnchorPluginKey,
    state: {
      init: (_, state) => buildDecorations(state.doc),
      apply: (transaction, decorations) =>
        transaction.docChanged
          ? buildDecorations(transaction.doc)
          : decorations.map(transaction.mapping, transaction.doc),
    },
    props: {
      decorations: (state) =>
        humanCommentAnchorPluginKey.getState(state) ?? null,
    },
  });
}
