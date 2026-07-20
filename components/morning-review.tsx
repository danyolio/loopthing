"use client";

import { useMemo, useState } from "react";
import { Check, GitBranch, LoaderCircle, MessageSquare, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { DreamChangeReview, LoopInsight, ThinkingItem } from "@/lib/domain";
import { dreamBlockChanges, type DreamBlockChange } from "@/lib/dream-highlights";
import { createClient } from "@/lib/supabase/client";

type ReviewAction = "kept" | "reverted" | "commented" | "branched";

function changeDetails(insight: LoopInsight | undefined) {
  return Array.isArray(insight?.change_details)
    ? insight.change_details.filter(
        (value): value is Record<string, unknown> =>
          Boolean(value) && typeof value === "object",
      )
    : [];
}

export function MorningReview({
  open,
  onOpenChange,
  projectId,
  userId,
  dreamVersion,
  beforeText,
  afterText,
  insight,
  initialReviews,
  editable,
  onRevert,
  onComment,
  onBranch,
  onReviewSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
  dreamVersion: ThinkingItem;
  beforeText: string;
  afterText: string;
  insight?: LoopInsight;
  initialReviews: DreamChangeReview[];
  editable: boolean;
  onRevert: (change: DreamBlockChange) => Promise<void>;
  onComment: (change: DreamBlockChange, note: string) => Promise<void>;
  onBranch: (change: DreamBlockChange) => Promise<void>;
  onReviewSaved: (review: DreamChangeReview) => void;
}) {
  const changes = useMemo(
    () => dreamBlockChanges(beforeText, afterText),
    [afterText, beforeText],
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const reviews = initialReviews.filter(
    (review) => review.dream_version_id === dreamVersion.id,
  );
  const reviewedByKey = new Map(reviews.map((review) => [review.block_key, review]));
  const details = changeDetails(insight);

  async function persist(change: DreamBlockChange, status: ReviewAction, note = "") {
    setWorking(change.blockKey);
    try {
      if (status === "reverted") await onRevert(change);
      if (status === "commented") await onComment(change, note);
      if (status === "branched") await onBranch(change);

      const { data, error } = await createClient()
        .from("dream_change_reviews")
        .upsert(
          {
            project_id: projectId,
            dream_version_id: dreamVersion.id,
            block_key: change.blockKey,
            before_text: change.beforeText,
            after_text: change.afterText,
            status,
            note,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          },
          { onConflict: "dream_version_id,block_key" },
        )
        .select("*")
        .single();
      if (error || !data) throw error ?? new Error("Review was not saved.");
      onReviewSaved(data as DreamChangeReview);
      toast.success(
        status === "kept"
          ? "Dream change kept."
          : status === "reverted"
            ? "Dream change reverted."
            : status === "commented"
              ? "Feedback added for the next Dream."
              : "Dream version preserved as a branch.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[min(94vw,880px)] overflow-hidden p-0">
        <DialogHeader className="border-b bg-violet-50/70 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-700" />
            Morning Review
          </DialogTitle>
          <DialogDescription>
            Review what changed overnight. Keep it, revert it, leave feedback, or preserve the Dream as a branch.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(90vh-7rem)] space-y-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {reviewedByKey.size} of {changes.length} changes reviewed
            </p>
            <Badge variant="secondary">{changes.length} changes</Badge>
          </div>

          {changes.map((change, index) => {
            const review = reviewedByKey.get(change.blockKey);
            const rationale = details.find((detail) => {
              const excerpt = detail.afterExcerpt;
              return typeof excerpt === "string" && change.afterText.includes(excerpt);
            });
            const note = notes[change.blockKey] ?? "";
            return (
              <article key={change.blockKey} className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between gap-3 border-b bg-violet-50/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-violet-600">Dream</Badge>
                    <span className="text-xs font-semibold">Change {index + 1}</span>
                    <span className="text-[10px] text-muted-foreground">{change.kind}</span>
                  </div>
                  {review && <Badge variant="outline">{review.status}</Badge>}
                </div>
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <div className="bg-background p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Before</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{change.beforeText || "Nothing"}</p>
                  </div>
                  <div className="bg-violet-50/35 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">After Dream</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{change.afterText || "Removed"}</p>
                  </div>
                </div>
                {rationale && (
                  <div className="border-t px-4 py-3 text-xs leading-5">
                    <strong>Why:</strong> {String(rationale.reason ?? "")}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {rationale.provenance === "human_direction" ? "Following human direction" : "Developed by the Dream"}
                    </p>
                  </div>
                )}
                {editable && (
                  <div className="space-y-2 border-t bg-muted/20 p-3">
                    <Textarea
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [change.blockKey]: event.target.value }))}
                      placeholder="Optional feedback for the next Dream"
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={working === change.blockKey} onClick={() => persist(change, "kept")}>
                        <Check />
                        Keep
                      </Button>
                      <Button size="sm" variant="outline" disabled={working === change.blockKey} onClick={() => persist(change, "reverted")}>
                        <RotateCcw />
                        Revert
                      </Button>
                      <Button size="sm" variant="outline" disabled={working === change.blockKey || !note.trim()} onClick={() => persist(change, "commented", note.trim())}>
                        <MessageSquare />
                        Feedback
                      </Button>
                      <Button size="sm" variant="outline" disabled={working === change.blockKey} onClick={() => persist(change, "branched")}>
                        {working === change.blockKey ? <LoaderCircle className="animate-spin" /> : <GitBranch />}
                        Branch
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
