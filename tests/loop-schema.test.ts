import { describe, expect, it } from "vitest";
import { loopResultSchema, startLoopSchema } from "@/lib/loop-schema";

const validResult = {
  materialChange: true,
  summary: "The target user is now narrower.",
  whatChanged: ["Evidence now points to active strategy teams."],
  whyItMatters: "The onboarding and value promise can become more specific.",
  unresolved: ["Whether solo users experience the same continuity problem."],
  evidence: [
    {
      sourceId: "source-1",
      claim: "Three teams described losing decision context between meetings.",
      support: "supports",
    },
  ],
  proposal: {
    title: "Narrow the initial user",
    rationale: "The supplied evidence supports a more precise first audience.",
    content: "Loop Thing initially serves teams working on evolving strategic decisions.",
    isSignificantBranch: true,
  },
  nextAction: "Test the revised promise with two active strategy teams.",
  thinkingEvolution: "The framing moved from general knowledge work to continuity of judgment.",
  changeAttribution: {
    directives: ["Narrow the initial audience to active strategy teams."],
    independent: ["Reordered the evidence before the product implication."],
    preserved: ["Kept the continuity-of-judgment framing."],
  },
};

describe("Loop structured output", () => {
  it("accepts the provider-independent golden result", () => {
    expect(loopResultSchema.parse(validResult)).toEqual(validResult);
  });

  it("rejects invented enum values and missing next actions", () => {
    expect(() =>
      loopResultSchema.parse({
        ...validResult,
        nextAction: "",
        evidence: [{ ...validResult.evidence[0], support: "proves" }],
      }),
    ).toThrow();
  });

  it.each(["google", "openai"] as const)(
    "accepts %s as a selectable synthesis provider",
    (provider) => {
      expect(
        startLoopSchema.parse({
          projectId: "68621480-c545-4fab-8a78-d592ccd9f47e",
          loopType: "light",
          provider,
        }).provider,
      ).toBe(provider);
    },
  );
});
