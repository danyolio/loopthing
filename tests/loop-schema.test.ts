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
  changeDetails: [
    {
      afterExcerpt: "active strategy teams",
      reason: "The strongest evidence came from teams with ongoing strategy work.",
      provenance: "human_direction",
      sourceIds: ["source-1"],
    },
  ],
  reasoning: {
    nodes: [
      {
        key: "evidence-continuity",
        type: "evidence",
        label: "Teams lose decision context between meetings.",
        detail: "Reported by three strategy teams.",
        confidence: 80,
        status: "active",
      },
      {
        key: "decision-audience",
        type: "decision",
        label: "Start with active strategy teams.",
        detail: "The evidence is strongest for this audience.",
        confidence: 75,
        status: "active",
      },
    ],
    edges: [
      {
        fromKey: "evidence-continuity",
        toKey: "decision-audience",
        relation: "led_to",
      },
    ],
  },
  decisionAlerts: [],
  critiqueComments: [
    {
      commentKey: "protect-opening",
      kind: "strength",
      scope: "passage",
      anchorText: "Loop Thing initially serves teams",
      sectionTitle: null,
      comment: "This is specific enough to give the rest of the argument a test.",
      suggestedNextStep: "Keep this sentence intact while testing the audience.",
    },
    {
      commentKey: "test-solo-countercase",
      kind: "question",
      scope: "document",
      anchorText: null,
      sectionTitle: null,
      comment: "Does narrowing to teams discard a stronger solo-user counterexample?",
      suggestedNextStep: null,
    },
  ],
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

  it("requires exact-location metadata for anchored criticism", () => {
    expect(() =>
      loopResultSchema.parse({
        ...validResult,
        critiqueComments: [
          {
            ...validResult.critiqueComments[0],
            anchorText: null,
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      loopResultSchema.parse({
        ...validResult,
        critiqueComments: [
          {
            ...validResult.critiqueComments[0],
            kind: "compliment",
          },
        ],
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
