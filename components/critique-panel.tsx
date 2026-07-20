"use client";

import { useState } from "react";
import {
  Check,
  CheckCheck,
  LoaderCircle,
  LocateFixed,
  MessageSquareReply,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CritiqueComment } from "@/lib/critiques";
import type { CritiqueReview, LoopInsight } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

const labels = {
  strength: "Strength",
  critique: "Critique",
  question: "Question",
  conjecture: "Conjecture",
  tension: "Tension",
  connection: "Connection",
  possibility: "Possibility",
} as const;

const scopeLabels = {
  passage: "On this passage",
  section: "On this section",
  document: "On the whole document",
} as const;

export function CritiquePanel({
  comments,
  insight,
  reviews,
  selectedKey,
  projectId,
  userId,
  onSelect,
  onLocate,
  onReviewSaved,
}: {
  comments: CritiqueComment[];
  insight: LoopInsight | undefined;
  reviews: CritiqueReview[];
  selectedKey: string | null;
  projectId: string;
  userId: string;
  onSelect: (key: string) => void;
  onLocate: (key: string) => void;
  onReviewSaved: (review: CritiqueReview) => void;
}) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const reviewsByKey = new Map(
    reviews
      .filter((review) => review.loop_insight_id === insight?.id)
      .map((review) => [review.comment_key, review]),
  );

  async function saveReview(
    comment: CritiqueComment,
    status: CritiqueReview["status"],
  ) {
    if (!insight) return;
    const response =
      responses[comment.commentKey] ??
      reviewsByKey.get(comment.commentKey)?.response ??
      "";
    setWorking(comment.commentKey);
    const { data, error } = await createClient()
      .from("critique_reviews")
      .upsert(
        {
          project_id: projectId,
          loop_insight_id: insight.id,
          comment_key: comment.commentKey,
          status,
          response: response.trim(),
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        },
        { onConflict: "loop_insight_id,comment_key" },
      )
      .select("*")
      .single();
    setWorking(null);
    if (error || !data) {
      toast.error(error?.message ?? "Could not save the critique response.");
      return;
    }
    onReviewSaved(data as CritiqueReview);
    toast.success(
      status === "open"
        ? "Response saved for the next Dream."
        : status === "incorporated"
          ? "Marked as incorporated."
          : status === "resolved"
            ? "Comment resolved."
            : "Comment dismissed.",
    );
  }

  if (!comments.length || !insight) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <Sparkles className="mx-auto size-5 text-violet-600" />
        <p className="mt-3 text-sm font-semibold">No critique yet</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          The next Loop can leave passage, section, and document-level
          interventions without forcing a rewrite.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Loopthing critique" className="space-y-3">
      <div className="rounded-xl bg-violet-50/70 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-950">
          <Sparkles className="size-4 text-violet-700" />
          Conjecture + criticism
        </p>
        <p className="mt-2 text-xs leading-5 text-violet-900/70">
          Specific judgment on what to protect, challenge, question, or
          develop. Rewriting is only one possible outcome.
        </p>
      </div>

      {comments.map((comment) => {
        const review = reviewsByKey.get(comment.commentKey);
        const response = responses[comment.commentKey] ?? review?.response ?? "";
        const selected = selectedKey === comment.commentKey;
        return (
          <article
            key={comment.commentKey}
            className={
              selected
                ? "overflow-hidden rounded-xl border border-violet-500 bg-violet-50/30 shadow-sm"
                : "overflow-hidden rounded-xl border bg-background"
            }
          >
            <button
              type="button"
              className="w-full p-4 text-left"
              onClick={() => {
                onSelect(comment.commentKey);
                if (comment.scope !== "document") onLocate(comment.commentKey);
              }}
            >
              <span className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    comment.kind === "strength"
                      ? "bg-emerald-700"
                      : "bg-violet-700"
                  }
                >
                  {labels[comment.kind]}
                </Badge>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {scopeLabels[comment.scope]}
                </span>
                {review && (
                  <Badge variant="outline" className="ml-auto">
                    {review.status}
                  </Badge>
                )}
              </span>
              {comment.anchorText && (
                <span className="mt-3 block border-l-2 border-violet-300 pl-3 text-xs italic leading-5 text-muted-foreground">
                  “{comment.anchorText}”
                </span>
              )}
              {!comment.anchorText && comment.sectionTitle && (
                <span className="mt-3 block text-xs font-semibold">
                  {comment.sectionTitle}
                </span>
              )}
              <span className="mt-3 block text-sm leading-6">
                {comment.comment}
              </span>
              {comment.suggestedNextStep && (
                <span className="mt-3 block rounded-lg bg-muted/55 p-2.5 text-xs leading-5">
                  <strong>Try:</strong> {comment.suggestedNextStep}
                </span>
              )}
            </button>

            <div className="space-y-2 border-t bg-muted/20 p-3">
              <Textarea
                value={response}
                aria-label={`Response to ${labels[comment.kind].toLowerCase()} comment`}
                onChange={(event) =>
                  setResponses((current) => ({
                    ...current,
                    [comment.commentKey]: event.target.value,
                  }))
                }
                placeholder="Respond, push back, or add direction for the next Dream"
                rows={2}
              />
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={working === comment.commentKey || !response.trim()}
                  onClick={() => saveReview(comment, "open")}
                >
                  <MessageSquareReply />
                  Reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={working === comment.commentKey}
                  onClick={() => saveReview(comment, "incorporated")}
                >
                  <CheckCheck />
                  Used
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={working === comment.commentKey}
                  onClick={() => saveReview(comment, "resolved")}
                >
                  {working === comment.commentKey ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Resolve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={working === comment.commentKey}
                  onClick={() => saveReview(comment, "dismissed")}
                >
                  <X />
                  Dismiss
                </Button>
                {comment.scope !== "document" && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto"
                    aria-label="Locate comment in document"
                    onClick={() => onLocate(comment.commentKey)}
                  >
                    <LocateFixed />
                  </Button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
