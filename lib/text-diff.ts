export type TextDiffLine = {
  kind: "context" | "added" | "removed";
  text: string;
  beforeLine: number | null;
  afterLine: number | null;
};

export type TextDiff = {
  lines: TextDiffLine[];
  added: number;
  removed: number;
};

function linesOf(text: string) {
  return text.replaceAll("\r\n", "\n").split("\n");
}

export function diffTextByLine(before: string, after: string): TextDiff {
  const beforeLines = linesOf(before);
  const afterLines = linesOf(after);
  const lengths = Array.from({ length: beforeLines.length + 1 }, () =>
    Array<number>(afterLines.length + 1).fill(0),
  );

  for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
      lengths[beforeIndex][afterIndex] =
        beforeLines[beforeIndex] === afterLines[afterIndex]
          ? lengths[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(
              lengths[beforeIndex + 1][afterIndex],
              lengths[beforeIndex][afterIndex + 1],
            );
    }
  }

  const lines: TextDiffLine[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;
  let added = 0;
  let removed = 0;

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      lines.push({
        kind: "context",
        text: beforeLines[beforeIndex],
        beforeLine: beforeIndex + 1,
        afterLine: afterIndex + 1,
      });
      beforeIndex += 1;
      afterIndex += 1;
    } else if (
      lengths[beforeIndex + 1][afterIndex] >=
      lengths[beforeIndex][afterIndex + 1]
    ) {
      lines.push({
        kind: "removed",
        text: beforeLines[beforeIndex],
        beforeLine: beforeIndex + 1,
        afterLine: null,
      });
      beforeIndex += 1;
      removed += 1;
    } else {
      lines.push({
        kind: "added",
        text: afterLines[afterIndex],
        beforeLine: null,
        afterLine: afterIndex + 1,
      });
      afterIndex += 1;
      added += 1;
    }
  }

  while (beforeIndex < beforeLines.length) {
    lines.push({
      kind: "removed",
      text: beforeLines[beforeIndex],
      beforeLine: beforeIndex + 1,
      afterLine: null,
    });
    beforeIndex += 1;
    removed += 1;
  }

  while (afterIndex < afterLines.length) {
    lines.push({
      kind: "added",
      text: afterLines[afterIndex],
      beforeLine: null,
      afterLine: afterIndex + 1,
    });
    afterIndex += 1;
    added += 1;
  }

  return { lines, added, removed };
}
