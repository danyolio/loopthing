import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ThinkingItem } from "@/lib/domain";

export const humanTextCommentKind = "text_comment";

export type HumanTextCommentAnchor = {
  kind: typeof humanTextCommentKind;
  quote: string;
  prefix: string;
  suffix: string;
  from: number;
  to: number;
};

export type HumanComment = {
  id: string;
  body: string;
  authorId: string;
  resolvedAt: string | null;
  anchor: HumanTextCommentAnchor | null;
  item: ThinkingItem;
};

export type ResolvedCommentRange = {
  from: number;
  to: number;
};

type FlatTextBlock = {
  text: string;
  position: number;
  flatStart: number;
};

function optionalText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function positionHint(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function parseHumanTextCommentAnchor(
  value: unknown,
): HumanTextCommentAnchor | null {
  if (!value || typeof value !== "object") return null;
  const anchor = value as Record<string, unknown>;
  const from = positionHint(anchor.from);
  const to = positionHint(anchor.to);
  const quote = optionalText(anchor.quote);
  if (
    anchor.kind !== humanTextCommentKind ||
    !quote.trim() ||
    from === null ||
    to === null ||
    to <= from
  ) {
    return null;
  }

  return {
    kind: humanTextCommentKind,
    quote,
    prefix: optionalText(anchor.prefix),
    suffix: optionalText(anchor.suffix),
    from,
    to,
  };
}

export function parseHumanComments(items: ThinkingItem[]): HumanComment[] {
  return items.map((item) => ({
    id: item.id,
    body: optionalText(item.body),
    authorId: optionalText(item.author_id),
    resolvedAt: optionalText(item.resolved_at) || null,
    anchor: parseHumanTextCommentAnchor(item.anchor),
    item,
  }));
}

export function createHumanTextCommentAnchor(
  doc: ProseMirrorNode,
  from: number,
  to: number,
): HumanTextCommentAnchor | null {
  if (to <= from) return null;
  const quote = doc.textBetween(from, to, "\n");
  if (!quote.trim() || quote.length > 2000) return null;

  return {
    kind: humanTextCommentKind,
    quote,
    prefix: doc
      .textBetween(Math.max(0, from - 80), from, "\n")
      .slice(-80),
    suffix: doc
      .textBetween(to, Math.min(doc.content.size, to + 80), "\n")
      .slice(0, 80),
    from,
    to,
  };
}

function flatTextBlocks(doc: ProseMirrorNode) {
  const blocks: FlatTextBlock[] = [];
  let flatLength = 0;
  doc.descendants((node, position) => {
    if (!node.isTextblock) return;
    if (blocks.length) flatLength += 1;
    blocks.push({
      text: node.textContent,
      position,
      flatStart: flatLength,
    });
    flatLength += node.textContent.length;
  });
  return blocks;
}

function rangesForOriginalPositions(
  doc: ProseMirrorNode,
  anchor: HumanTextCommentAnchor,
) {
  if (
    anchor.to > doc.content.size ||
    doc.textBetween(anchor.from, anchor.to, "\n") !== anchor.quote
  ) {
    return [];
  }

  const ranges: ResolvedCommentRange[] = [];
  doc.nodesBetween(anchor.from, anchor.to, (node, position) => {
    if (!node.isTextblock) return;
    const from = Math.max(anchor.from, position + 1);
    const to = Math.min(anchor.to, position + node.nodeSize - 1);
    if (to > from) ranges.push({ from, to });
  });
  return ranges;
}

function occurrenceIndexes(text: string, quote: string) {
  const indexes: number[] = [];
  let cursor = 0;
  while (cursor <= text.length - quote.length) {
    const index = text.indexOf(quote, cursor);
    if (index === -1) break;
    indexes.push(index);
    cursor = index + Math.max(quote.length, 1);
  }
  return indexes;
}

function bestOccurrence(
  text: string,
  anchor: HumanTextCommentAnchor,
) {
  const indexes = occurrenceIndexes(text, anchor.quote);
  if (!indexes.length) return -1;

  return indexes
    .map((index) => {
      const before = text.slice(0, index);
      const after = text.slice(index + anchor.quote.length);
      const score =
        (anchor.prefix && before.endsWith(anchor.prefix) ? 2 : 0) +
        (anchor.suffix && after.startsWith(anchor.suffix) ? 2 : 0);
      return { index, score };
    })
    .sort((left, right) => right.score - left.score)[0].index;
}

export function resolveHumanCommentRanges(
  doc: ProseMirrorNode,
  anchor: HumanTextCommentAnchor,
) {
  const original = rangesForOriginalPositions(doc, anchor);
  if (original.length) return original;

  const blocks = flatTextBlocks(doc);
  const flatText = blocks.map(({ text }) => text).join("\n");
  const flatStart = bestOccurrence(flatText, anchor);
  if (flatStart === -1) return [];
  const flatEnd = flatStart + anchor.quote.length;

  return blocks.flatMap((block) => {
    const blockStart = block.flatStart;
    const blockEnd = blockStart + block.text.length;
    const intersectionStart = Math.max(flatStart, blockStart);
    const intersectionEnd = Math.min(flatEnd, blockEnd);
    if (intersectionEnd <= intersectionStart) return [];

    return [{
      from: block.position + 1 + intersectionStart - blockStart,
      to: block.position + 1 + intersectionEnd - blockStart,
    }];
  });
}
