import { Highlighter, History, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

type DreamChangeNoticeProps = {
  changedSections: number;
  highlightsVisible: boolean;
  onToggleHighlights: () => void;
  onOpenReview: () => void;
  onOpenVersions: () => void;
};

export function DreamChangeNotice({
  changedSections,
  highlightsVisible,
  onToggleHighlights,
  onOpenReview,
  onOpenVersions,
}: DreamChangeNoticeProps) {
  if (!changedSections) return null;

  return (
    <section
      aria-label="Latest Dream changes"
      className="mb-8 rounded-xl border border-violet-600/20 bg-violet-50/70 p-3.5 text-violet-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-violet-600/10">
            <Highlighter className="size-3.5 text-violet-700" />
          </span>
          <div>
            <p className="text-xs font-semibold">Latest Dream changes</p>
            <p className="mt-0.5 text-[11px] leading-4 text-violet-900/70">
              {changedSections}{" "}
              {changedSections === 1 ? "section changed." : "sections changed."}{" "}
              {highlightsVisible
                ? "Changes are highlighted by source."
                : "Turn highlights on to review them."}
            </p>
            {highlightsVisible && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-violet-400" />
                  Dream changes
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-900">
                  <span className="size-2 rounded-sm bg-emerald-400" />
                  Your additions
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            className="h-7 bg-violet-700 text-white hover:bg-violet-800"
            onClick={onOpenReview}
          >
            <ListChecks />
            Morning Review
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-violet-950 hover:bg-violet-600/10 hover:text-violet-950"
            onClick={onToggleHighlights}
          >
            <Highlighter />
            {highlightsVisible ? "Hide highlights" : "Show highlights"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-violet-950 hover:bg-violet-600/10 hover:text-violet-950"
            onClick={onOpenVersions}
          >
            <History />
            Open Versions
          </Button>
        </div>
      </div>
    </section>
  );
}
