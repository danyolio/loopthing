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

export const changeDetailSchema = z.object({
  afterExcerpt: z.string().min(1).max(500),
  reason: z.string().min(1).max(1000),
  provenance: z.enum(["human_direction", "dream_development"]),
  sourceIds: z.array(z.string()).max(8),
});

export const reasoningNodeSchema = z.object({
  key: z.string().min(1).max(120),
  type: z.enum([
    "goal",
    "constraint",
    "fact",
    "evidence",
    "claim",
    "assumption",
    "hypothesis",
    "preference",
    "question",
    "counterargument",
    "risk",
    "decision",
    "proposal",
    "experiment",
  ]),
  label: z.string().min(1).max(500),
  detail: z.string().max(2000),
  confidence: z.number().int().min(0).max(100).nullable(),
  status: z.enum(["active", "resolved", "superseded"]),
});

export const reasoningEdgeSchema = z.object({
  fromKey: z.string().min(1).max(120),
  toKey: z.string().min(1).max(120),
  relation: z.enum([
    "supports",
    "challenges",
    "depends_on",
    "contradicts",
    "led_to",
    "supersedes",
    "reopens",
    "tests",
  ]),
});

export const reasoningModelSchema = z.object({
  nodes: z.array(reasoningNodeSchema).max(36),
  edges: z.array(reasoningEdgeSchema).max(60),
});

export const decisionAlertSchema = z.object({
  decisionId: z.string().nullable(),
  decisionStatement: z.string().min(1).max(500),
  severity: z.enum(["watch", "reconsider"]),
  reason: z.string().min(1).max(1200),
  conflictingEvidence: z.array(z.string()).max(8),
  smallestExperiment: z.string().min(1).max(1000),
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
  changeDetails: z.array(changeDetailSchema).max(24),
  reasoning: reasoningModelSchema,
  decisionAlerts: z.array(decisionAlertSchema).max(12),
});

export const startLoopSchema = z.object({
  projectId: z.uuid(),
  loopType: z.enum(["light", "daily", "weekly"]).default("light"),
  provider: z.enum(["google", "openai"]).optional(),
});

export type LoopResult = z.infer<typeof loopResultSchema>;
