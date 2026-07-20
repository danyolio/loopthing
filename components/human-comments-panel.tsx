"use client";

import { Check, LocateFixed, MessageSquareText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HumanComment } from "@/lib/human-comments";

export function HumanCommentsPanel({
  comments,
  selectedId,
  userId,
  isOwner,
  onSelect,
  onLocate,
  onResolve,
}: {
  comments: HumanComment[];
  selectedId: string | null;
  userId: string;
  isOwner: boolean;
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
  onResolve: (comment: HumanComment, resolved: boolean) => void;
}) {
  if (!comments.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <MessageSquareText className="mx-auto size-5 text-emerald-700" />
        <p className="mt-3 text-sm font-semibold">No comments yet</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Highlight text in the document and choose Comment, or add a broader
          note above.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Human comments" className="space-y-3">
      {comments.map((comment) => {
        const selected = selectedId === comment.id;
        const canResolve = isOwner || comment.authorId === userId;
        return (
          <article
            key={comment.id}
            className={
              selected
                ? "rounded-xl border border-emerald-600 bg-emerald-50/70 p-4 shadow-sm"
                : "rounded-xl border border-emerald-600/20 bg-emerald-50/45 p-4"
            }
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                onSelect(comment.id);
                if (comment.anchor && !comment.resolvedAt) {
                  onLocate(comment.id);
                }
              }}
            >
              <span className="flex items-center gap-2">
                <Badge className="bg-emerald-700">
                  {comment.anchor ? "On this text" : "Project note"}
                </Badge>
                {comment.resolvedAt && (
                  <Badge variant="outline">resolved</Badge>
                )}
              </span>
              {comment.anchor && (
                <span className="mt-3 line-clamp-3 block border-l-2 border-emerald-400 pl-3 text-xs italic leading-5 text-muted-foreground">
                  “{comment.anchor.quote}”
                </span>
              )}
              <span className="mt-3 block whitespace-pre-wrap text-sm leading-6">
                {comment.body}
              </span>
            </button>
            <div className="mt-3 flex gap-1.5 border-t border-emerald-700/10 pt-3">
              {comment.anchor && !comment.resolvedAt && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onLocate(comment.id)}
                >
                  <LocateFixed />
                  Locate
                </Button>
              )}
              {canResolve && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => onResolve(comment, !comment.resolvedAt)}
                >
                  {comment.resolvedAt ? <RotateCcw /> : <Check />}
                  {comment.resolvedAt ? "Reopen" : "Resolve"}
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
