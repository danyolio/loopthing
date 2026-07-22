"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRight, MessageSquareText, Sparkles } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { parseCritiqueComments } from "@/lib/critiques";
import type { LoopInsight } from "@/lib/domain";

export function OverallFeedbackCard({
  insight,
  onOpenCritique,
  onOpenLoop,
}: {
  insight: LoopInsight;
  onOpenCritique: () => void;
  onOpenLoop: () => void;
}) {
  const comments = parseCritiqueComments(insight.critique_comments);
  const documentComment = comments.find(
    (comment) => comment.scope === "document" && comment.kind !== "strength",
  );
  const overallRead = documentComment?.comment || insight.why_it_matters;

  return (
    <article
      aria-label="Overall Loop feedback"
      className="overflow-hidden rounded-xl border border-violet-300/70 bg-violet-50/45 shadow-[0_12px_32px_-28px_rgba(109,40,217,0.8)]"
    >
      <div className="border-b border-violet-200/70 bg-[var(--ink)] px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">
            <Sparkles className="size-3.5" />
            Overall feedback
          </p>
          <span className="text-[10px] text-white/45">
            {formatDistanceToNow(new Date(insight.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
        <MessageResponse className="mt-2 text-[15px] font-semibold leading-6 text-white [&_p]:m-0">
          {insight.summary}
        </MessageResponse>
      </div>

      <div className="space-y-4 p-4">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
            Editorial read
          </p>
          <MessageResponse className="mt-1.5 text-[13px] leading-5.5 text-foreground/80 [&_p]:m-0">
            {overallRead}
          </MessageResponse>
        </section>

        <section className="border-l-2 border-violet-500 pl-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
            Direction now
          </p>
          <MessageResponse className="mt-1 text-[13px] font-medium leading-5.5 [&_p]:m-0">
            {insight.next_action}
          </MessageResponse>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-violet-200/70 pt-3">
          {comments.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-violet-300 bg-white/70 text-xs"
              onClick={onOpenCritique}
            >
              <MessageSquareText />
              {comments.length} specific {comments.length === 1 ? "note" : "notes"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-violet-900"
            onClick={onOpenLoop}
          >
            Full Loop
            <ArrowRight />
          </Button>
        </div>
      </div>
    </article>
  );
}
