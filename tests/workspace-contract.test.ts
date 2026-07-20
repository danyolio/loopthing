import { describe, expect, it, vi } from "vitest";
import { replaceCanonicalDocument } from "@/lib/canonical-document";
import {
  collectionForItemKind,
  itemKindForCollection,
} from "@/lib/workspace-items";
import {
  dreamChangedAfterBlockIndexes,
  dreamChangedCurrentBlockIndexes,
  humanChangedCurrentBlockIndexes,
} from "@/lib/dream-highlights";
import { diffTextByLine } from "@/lib/text-diff";

describe("workspace contracts", () => {
  it("maps branch to branches in both directions", () => {
    expect(collectionForItemKind("branch")).toBe("branches");
    expect(itemKindForCollection("branches")).toBe("branch");
  });

  it("replaces the canonical document with sanitized proposal HTML", () => {
    const setContent = vi.fn();

    replaceCanonicalDocument(
      { commands: { setContent } },
      "# Revised thesis\n\n<script>unsafe()</script>",
    );

    expect(setContent).toHaveBeenCalledOnce();
    expect(setContent).toHaveBeenCalledWith(
      "<h1>Revised thesis</h1><p>&lt;script&gt;unsafe()&lt;/script&gt;</p>",
    );
  });

  it("produces a stable Git-style line diff for a Dream change set", () => {
    const diff = diffTextByLine(
      "Keep this line.\nRemove this line.",
      "Keep this line.\nAdd this line.",
    );

    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.lines.map(({ kind, text }) => [kind, text])).toEqual([
      ["context", "Keep this line."],
      ["removed", "Remove this line."],
      ["added", "Add this line."],
    ]);
  });

  it("maps the latest Dream changes onto the current document blocks", () => {
    const before = "Thesis\n\nKeep this.\n\nAn abstract opening.";
    const after = "Thesis\n\nKeep this.\n\nOpen with a concrete example.";

    expect(dreamChangedAfterBlockIndexes(before, after)).toEqual([2]);
    expect(
      dreamChangedCurrentBlockIndexes(before, after, [
        "A new human note.",
        "Thesis",
        "Keep this.",
        "Open with a concrete example.",
      ]),
    ).toEqual([3]);
  });

  it("does not mislabel a Dream section after a person rewrites it", () => {
    const currentBlocks = ["Thesis", "I rewrote the opening myself."];

    expect(
      dreamChangedCurrentBlockIndexes(
        "Thesis\n\nAn abstract opening.",
        "Thesis\n\nOpen with a concrete example.",
        currentBlocks,
      ),
    ).toEqual([]);
    expect(
      humanChangedCurrentBlockIndexes(
        "Thesis\n\nOpen with a concrete example.",
        currentBlocks,
      ),
    ).toEqual([1]);
  });

  it("marks additions made after the latest Dream as human changes", () => {
    expect(
      humanChangedCurrentBlockIndexes(
        "Thesis\n\nOpen with a concrete example.",
        [
          "A new human note.",
          "Thesis",
          "Open with a concrete example.",
        ],
      ),
    ).toEqual([0]);
  });
});
