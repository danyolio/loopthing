import { describe, expect, it, vi } from "vitest";
import { replaceCanonicalDocument } from "@/lib/canonical-document";
import {
  collectionForItemKind,
  itemKindForCollection,
} from "@/lib/workspace-items";
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
});
