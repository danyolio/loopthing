import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  dreamChangedCurrentBlockIndexes,
  humanChangedCurrentBlockIndexes,
} from "@/lib/dream-highlights";

type TextBlock = {
  node: ProseMirrorNode;
  position: number;
};

export const dreamHighlightPluginKey = new PluginKey<DecorationSet>(
  "dream-change-highlights",
);

function buildDecorations({
  doc,
  before,
  after,
}: {
  doc: ProseMirrorNode;
  before: string;
  after: string;
}) {
  const blocks: TextBlock[] = [];
  doc.descendants((node, position) => {
    if (node.isTextblock) blocks.push({ node, position });
  });

  const currentBlocks = blocks.map(({ node }) => node.textContent);
  const dreamChangedIndexes = dreamChangedCurrentBlockIndexes(
    before,
    after,
    currentBlocks,
  );
  const humanChangedIndexes = humanChangedCurrentBlockIndexes(
    after,
    currentBlocks,
  );
  const decorations = dreamChangedIndexes.flatMap((index) => {
    const block = blocks[index];
    if (!block) return [];
    return [
      Decoration.node(
        block.position,
        block.position + block.node.nodeSize,
        {
          class: "dream-change-highlight",
          "data-change-source": "dream",
        },
      ),
    ];
  });
  decorations.push(
    ...humanChangedIndexes.flatMap((index) => {
      const block = blocks[index];
      if (!block) return [];
      return [
        Decoration.node(
          block.position,
          block.position + block.node.nodeSize,
          {
            class: "human-change-highlight",
            "data-change-source": "human",
          },
        ),
      ];
    }),
  );

  return DecorationSet.create(doc, decorations);
}

export function createDreamHighlightPlugin({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  return new Plugin({
    key: dreamHighlightPluginKey,
    state: {
      init: (_, state) => buildDecorations({ doc: state.doc, before, after }),
      apply: (transaction, decorations) =>
        transaction.docChanged
          ? buildDecorations({ doc: transaction.doc, before, after })
          : decorations,
    },
    props: {
      decorations: (state) => dreamHighlightPluginKey.getState(state) ?? null,
    },
  });
}
