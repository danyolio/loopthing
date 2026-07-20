import { describe, expect, it } from "vitest";
import { parseCritiqueComments } from "@/lib/critiques";

describe("structured critique", () => {
  it("keeps valid multilevel comments and rejects unanchored passage noise", () => {
    expect(
      parseCritiqueComments([
        {
          commentKey: "specific-strength",
          kind: "strength",
          scope: "passage",
          anchorText: "This claim is precise.",
          sectionTitle: null,
          comment: "Keep this sentence. It gives the thesis a falsifiable centre.",
          suggestedNextStep: null,
        },
        {
          commentKey: "missing-anchor",
          kind: "critique",
          scope: "passage",
          anchorText: null,
          sectionTitle: null,
          comment: "This cannot be located.",
          suggestedNextStep: null,
        },
        {
          commentKey: "whole-work",
          kind: "conjecture",
          scope: "document",
          anchorText: null,
          sectionTitle: null,
          comment: "The counter-case may be the more original argument.",
          suggestedNextStep: "Invert the thesis for one pass.",
        },
      ]),
    ).toEqual([
      {
        commentKey: "specific-strength",
        kind: "strength",
        scope: "passage",
        anchorText: "This claim is precise.",
        sectionTitle: null,
        comment: "Keep this sentence. It gives the thesis a falsifiable centre.",
        suggestedNextStep: null,
      },
      {
        commentKey: "whole-work",
        kind: "conjecture",
        scope: "document",
        anchorText: null,
        sectionTitle: null,
        comment: "The counter-case may be the more original argument.",
        suggestedNextStep: "Invert the thesis for one pass.",
      },
    ]);
  });
});
