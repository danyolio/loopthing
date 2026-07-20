import { MessageSquareText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CritiqueComment } from "@/lib/critiques";

export function CritiqueNotice({
  comments,
  onOpen,
}: {
  comments: CritiqueComment[];
  onOpen: () => void;
}) {
  if (!comments.length) return null;

  const anchored = comments.filter(
    ({ scope }) => scope === "passage" || scope === "section",
  ).length;

  return (
    <section
      aria-label="Loopthing critique"
      className="mb-5 rounded-xl border border-violet-600/20 bg-violet-50/55 p-3.5 text-violet-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-violet-600/10">
            <Sparkles className="size-3.5 text-violet-700" />
          </span>
          <div>
            <p className="text-xs font-semibold">
              Loopthing left {comments.length} thoughtful{" "}
              {comments.length === 1 ? "intervention" : "interventions"}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-violet-900/70">
              {anchored
                ? `${anchored} anchored directly in the document.`
                : "These respond to the document as a whole."}{" "}
              Strengths count as criticism too.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-7 bg-violet-700 text-white hover:bg-violet-800"
          onClick={onOpen}
        >
          <MessageSquareText />
          Read critique
        </Button>
      </div>
    </section>
  );
}
