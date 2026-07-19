import { describe, expect, it, vi } from "vitest";
import { replaceCanonicalDocument } from "@/lib/canonical-document";
import {
  collectionForItemKind,
  itemKindForCollection,
} from "@/lib/workspace-items";

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
});
