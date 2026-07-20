import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { CritiqueComment } from "@/lib/critiques";

type TextBlock = {
  node: ProseMirrorNode;
  position: number;
};

export const critiqueAnchorPluginKey = new PluginKey<DecorationSet>(
  "ai-critique-anchors",
);

function marker(comment: CritiqueComment, onSelect: (key: string) => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ai-critique-marker";
  button.dataset.critiqueKey = comment.commentKey;
  button.setAttribute(
    "aria-label",
    `Open Loopthing ${comment.kind} comment`,
  );
  button.title = `Loopthing ${comment.kind}`;
  button.contentEditable = "false";
  button.textContent = "✦";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(comment.commentKey);
  });
  return button;
}

function buildDecorations({
  doc,
  comments,
  onSelect,
}: {
  doc: ProseMirrorNode;
  comments: CritiqueComment[];
  onSelect: (key: string) => void;
}) {
  const blocks: TextBlock[] = [];
  doc.descendants((node, position) => {
    if (node.isTextblock) blocks.push({ node, position });
  });

  const decorations = comments.flatMap((comment) => {
    if (comment.scope === "document") return [];

    if (comment.scope === "section" && comment.sectionTitle) {
      const block = blocks.find(
        ({ node }) =>
          node.type.name === "heading" &&
          node.textContent.trim() === comment.sectionTitle,
      );
      if (!block) return [];
      const from = block.position;
      const to = block.position + block.node.nodeSize;
      return [
        Decoration.node(from, to, {
          class: "ai-critique-section-anchor",
          "data-critique-anchor": comment.commentKey,
        }),
        Decoration.widget(
          Math.max(from + 1, to - 1),
          () => marker(comment, onSelect),
          { key: `critique-marker:${comment.commentKey}`, side: 1 },
        ),
      ];
    }

    if (comment.scope === "passage" && comment.anchorText) {
      const sectionStart = comment.sectionTitle
        ? blocks.findIndex(
            ({ node }) =>
              node.type.name === "heading" &&
              node.textContent.trim() === comment.sectionTitle,
          )
        : -1;
      const nextHeading =
        sectionStart >= 0
          ? blocks.findIndex(
              ({ node }, index) =>
                index > sectionStart && node.type.name === "heading",
            )
          : -1;
      const candidates =
        sectionStart >= 0
          ? blocks.slice(
              sectionStart,
              nextHeading === -1 ? blocks.length : nextHeading,
            )
          : blocks;
      const block = candidates.find(({ node }) =>
        node.textContent.includes(comment.anchorText!),
      );
      if (!block) return [];
      const offset = block.node.textContent.indexOf(comment.anchorText);
      const from = block.position + 1 + offset;
      const to = from + comment.anchorText.length;
      return [
        Decoration.inline(from, to, {
          class: "ai-critique-passage-anchor",
          "data-critique-anchor": comment.commentKey,
        }),
        Decoration.widget(to, () => marker(comment, onSelect), {
          key: `critique-marker:${comment.commentKey}`,
          side: 1,
        }),
      ];
    }

    return [];
  });

  return DecorationSet.create(doc, decorations);
}

export function createCritiqueAnchorPlugin({
  comments,
  onSelect,
}: {
  comments: CritiqueComment[];
  onSelect: (key: string) => void;
}) {
  return new Plugin({
    key: critiqueAnchorPluginKey,
    state: {
      init: (_, state) =>
        buildDecorations({ doc: state.doc, comments, onSelect }),
      apply: (transaction, decorations) =>
        transaction.docChanged
          ? buildDecorations({
              doc: transaction.doc,
              comments,
              onSelect,
            })
          : decorations.map(transaction.mapping, transaction.doc),
    },
    props: {
      decorations: (state) =>
        critiqueAnchorPluginKey.getState(state) ?? null,
    },
  });
}
