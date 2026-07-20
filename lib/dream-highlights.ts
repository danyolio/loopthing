import type { ThinkingItem } from "@/lib/domain";

export type DreamChangeSet = {
  before: ThinkingItem;
  after: ThinkingItem;
};

function textOf(item: ThinkingItem | undefined, key: string) {
  const value = item?.[key];
  return typeof value === "string" ? value : "";
}

function normalizeBlock(block: string) {
  return block.replace(/\s+/g, " ").trim();
}

export function textBlocks(text: string) {
  if (!text.trim()) return [];
  return text
    .replaceAll("\r\n", "\n")
    .split(/\n(?:[ \t]*\n)+/)
    .map(normalizeBlock)
    .filter(Boolean);
}

function matchingIndexes(left: string[], right: string[]) {
  const lengths = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (
      let rightIndex = right.length - 1;
      rightIndex >= 0;
      rightIndex -= 1
    ) {
      lengths[leftIndex][rightIndex] =
        left[leftIndex] === right[rightIndex]
          ? lengths[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(
              lengths[leftIndex + 1][rightIndex],
              lengths[leftIndex][rightIndex + 1],
            );
    }
  }

  const matches: Array<[number, number]> = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      matches.push([leftIndex, rightIndex]);
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      lengths[leftIndex + 1][rightIndex] >=
      lengths[leftIndex][rightIndex + 1]
    ) {
      leftIndex += 1;
    } else {
      rightIndex += 1;
    }
  }

  return matches;
}

export function dreamChangedAfterBlockIndexes(before: string, after: string) {
  const beforeBlocks = textBlocks(before);
  const afterBlocks = textBlocks(after);
  const unchangedAfterIndexes = new Set(
    matchingIndexes(beforeBlocks, afterBlocks).map(
      ([, afterIndex]) => afterIndex,
    ),
  );

  return afterBlocks.flatMap((_, afterIndex) =>
    unchangedAfterIndexes.has(afterIndex) ? [] : [afterIndex],
  );
}

export function dreamChangedCurrentBlockIndexes(
  before: string,
  after: string,
  currentBlocks: string[],
) {
  const afterBlocks = textBlocks(after);
  const normalizedCurrentBlocks = currentBlocks.map(normalizeBlock);
  const changedAfterIndexes = new Set(
    dreamChangedAfterBlockIndexes(before, after),
  );
  const afterToCurrent = new Map(
    matchingIndexes(afterBlocks, normalizedCurrentBlocks),
  );

  return [...changedAfterIndexes].flatMap((afterIndex) => {
    const currentIndex = afterToCurrent.get(afterIndex);
    return currentIndex === undefined ? [] : [currentIndex];
  });
}

export function humanChangedCurrentBlockIndexes(
  dreamAfter: string,
  currentBlocks: string[],
) {
  const dreamBlocks = textBlocks(dreamAfter);
  const normalizedCurrentBlocks = currentBlocks.map(normalizeBlock);
  const unchangedCurrentIndexes = new Set(
    matchingIndexes(dreamBlocks, normalizedCurrentBlocks).map(
      ([, currentIndex]) => currentIndex,
    ),
  );

  return normalizedCurrentBlocks.flatMap((_, currentIndex) =>
    unchangedCurrentIndexes.has(currentIndex) ? [] : [currentIndex],
  );
}

export function latestDreamChangeSet(
  versions: ThinkingItem[],
): DreamChangeSet | null {
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const preDreamByRun = new Map(
    versions
      .filter((version) => textOf(version, "source") === "pre_dream")
      .map((version) => [textOf(version, "loop_run_id"), version]),
  );
  const dreamVersions = versions
    .filter((version) => textOf(version, "source") === "dream")
    .sort(
      (left, right) =>
        Date.parse(textOf(right, "created_at")) -
        Date.parse(textOf(left, "created_at")),
    );

  for (const after of dreamVersions) {
    const before =
      versionById.get(textOf(after, "base_version_id")) ??
      preDreamByRun.get(textOf(after, "loop_run_id"));
    if (before) return { before, after };
  }

  return null;
}
