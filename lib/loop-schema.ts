import { z } from "zod";

export const evidenceSchema = z.object({
  sourceId: z.string().nullable(),
  claim: z.string().min(1),
  support: z.enum(["supports", "challenges", "context"]),
});

export const proposalSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().min(1),
  content: z
    .string()
    .min(1)
    .describe(
      "The complete revised canonical document in Markdown, ready to become the next restorable version.",
    ),
  isSignificantBranch: z.boolean(),
});

export const changeAttributionSchema = z.object({
  directives: z
    .array(z.string())
    .max(12)
    .describe("Changes traceable to explicit human notes, feedback, or decisions."),
  independent: z
    .array(z.string())
    .max(12)
    .describe("Editorial or analytical changes the model chose without a directive."),
  preserved: z
    .array(z.string())
    .max(12)
    .describe("Important material deliberately left intact."),
});

export const loopResultSchema = z.object({
  materialChange: z.boolean(),
  summary: z.string().min(1),
  whatChanged: z.array(z.string()).max(12),
  whyItMatters: z.string().min(1),
  unresolved: z.array(z.string()).max(12),
  evidence: z.array(evidenceSchema).max(20),
  proposal: proposalSchema.nullable(),
  nextAction: z.string().min(1),
  thinkingEvolution: z.string(),
  changeAttribution: changeAttributionSchema,
});

export const startLoopSchema = z.object({
  projectId: z.uuid(),
  loopType: z.enum(["light", "daily", "weekly"]).default("light"),
  provider: z.enum(["google", "openai"]).optional(),
});

export type LoopResult = z.infer<typeof loopResultSchema>;
