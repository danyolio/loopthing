import type { LoopInsight } from "@/lib/domain";

export const critiqueKinds = [
  "strength",
  "critique",
  "question",
  "conjecture",
  "tension",
  "connection",
  "possibility",
] as const;

export const critiqueScopes = ["passage", "section", "document"] as const;

export type CritiqueKind = (typeof critiqueKinds)[number];
export type CritiqueScope = (typeof critiqueScopes)[number];

export type CritiqueComment = {
  commentKey: string;
  kind: CritiqueKind;
  scope: CritiqueScope;
  anchorText: string | null;
  sectionTitle: string | null;
  comment: string;
  suggestedNextStep: string | null;
};

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseCritiqueComments(value: unknown): CritiqueComment[] {
  if (!Array.isArray(value)) return [];

  const parsed = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const comment = item as Record<string, unknown>;
    if (
      !critiqueKinds.includes(comment.kind as CritiqueKind) ||
      !critiqueScopes.includes(comment.scope as CritiqueScope) ||
      typeof comment.comment !== "string" ||
      !comment.comment.trim()
    ) {
      return [];
    }

    const kind = comment.kind as CritiqueKind;
    const scope = comment.scope as CritiqueScope;
    const anchorText = optionalText(comment.anchorText);
    const sectionTitle = optionalText(comment.sectionTitle);
    if (scope === "passage" && !anchorText) return [];
    if (scope === "section" && !sectionTitle) return [];

    return [{
      commentKey:
        optionalText(comment.commentKey) ?? `${kind}-${scope}-${index + 1}`,
      kind,
      scope,
      anchorText,
      sectionTitle,
      comment: comment.comment.trim(),
      suggestedNextStep: optionalText(comment.suggestedNextStep),
    }];
  });

  const seen = new Set<string>();
  return parsed.filter(({ commentKey }) => {
    if (seen.has(commentKey)) return false;
    seen.add(commentKey);
    return true;
  });
}

export function latestCritiqueInsight(insights: LoopInsight[]) {
  return insights.find(
    (insight) => parseCritiqueComments(insight.critique_comments).length > 0,
  );
}
