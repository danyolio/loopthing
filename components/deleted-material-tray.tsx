"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Scissors } from "lucide-react";
import {
  humanDeletedDreamBlocks,
  textBlocks,
  type HumanDeletedBlock,
} from "@/lib/dream-highlights";

export function DeletedMaterialTray({
  editor,
  dreamAfter,
}: {
  editor: Editor;
  dreamAfter: string;
}) {
  const [deletedBlocks, setDeletedBlocks] = useState<HumanDeletedBlock[]>([]);

  useEffect(() => {
    const updateDeletedBlocks = () => {
      const currentBlocks = textBlocks(
        editor.getText({ blockSeparator: "\n\n" }),
      );
      setDeletedBlocks(humanDeletedDreamBlocks(dreamAfter, currentBlocks));
    };

    updateDeletedBlocks();
    editor.on("update", updateDeletedBlocks);
    return () => {
      editor.off("update", updateDeletedBlocks);
    };
  }, [dreamAfter, editor]);

  if (!deletedBlocks.length) return null;

  return (
    <section
      aria-label="Removed material"
      aria-live="polite"
      className="mt-20 border-t border-red-900/15 pt-8"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-red-100">
          <Scissors className="size-3.5 text-red-700" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Removed since the last Dream</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Deleted or rewritten passages stay out of the working document.
            The next Dream treats their removal as human direction.
          </p>
        </div>
      </div>
      <ol className="mt-5 space-y-3">
        {deletedBlocks.map((block) => (
          <li
            key={`${block.dreamIndex}:${block.text}`}
            className="rounded-xl border border-red-900/15 bg-red-50/70 px-4 py-3"
          >
            <del className="whitespace-pre-wrap text-sm leading-6 text-red-950 decoration-red-500 decoration-2">
              {block.text}
            </del>
          </li>
        ))}
      </ol>
    </section>
  );
}
