import { Highlighter, History } from "lucide-react";
import { Button } from "@/components/ui/button";

type DreamChangeNoticeProps = {
  changedSections: number;
  highlightsVisible: boolean;
  onToggleHighlights: () => void;
  onOpenVersions: () => void;
};

export function DreamChangeNotice({
  changedSections,
  highlightsVisible,
  onToggleHighlights,
  onOpenVersions,
}: DreamChangeNoticeProps) {
  if (!changedSections) return null;

  return (
    <section
      aria-label="Latest Dream changes"
      className="mb-8 rounded-xl border border-emerald-600/20 bg-emerald-50/70 p-3.5 text-emerald-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-600/10">
            <Highlighter className="size-3.5 text-emerald-700" />
          </span>
          <div>
            <p className="text-xs font-semibold">Latest Dream changes</p>
            <p className="mt-0.5 text-[11px] leading-4 text-emerald-900/70">
              {changedSections}{" "}
              {changedSections === 1 ? "section changed." : "sections changed."}{" "}
              {highlightsVisible
                ? "Dream additions are highlighted in the document."
                : "Turn highlights on to review them."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-emerald-950 hover:bg-emerald-600/10 hover:text-emerald-950"
            onClick={onToggleHighlights}
          >
            <Highlighter />
            {highlightsVisible ? "Hide highlights" : "Show highlights"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-emerald-950 hover:bg-emerald-600/10 hover:text-emerald-950"
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
