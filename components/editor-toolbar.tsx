"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const actions = [
  { label: "Undo", icon: Undo2, run: (e: Editor) => e.chain().focus().undo().run() },
  { label: "Redo", icon: Redo2, run: (e: Editor) => e.chain().focus().redo().run() },
  { label: "Bold", icon: Bold, run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { label: "Italic", icon: Italic, run: (e: Editor) => e.chain().focus().toggleItalic().run() },
  {
    label: "Heading 1",
    icon: Heading1,
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    icon: Heading2,
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  { label: "Bullets", icon: List, run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  {
    label: "Numbered list",
    icon: ListOrdered,
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Quote",
    icon: Quote,
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
];

export function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  if (!editor) return <div className="h-9" />;

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {actions.map(({ label, icon: Icon, run }, index) => (
        <span className="contents" key={label}>
          {(index === 2 || index === 4 || index === 6) && (
            <Separator orientation="vertical" className="mx-1 h-5" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={label}
                onClick={() => run(editor)}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        </span>
      ))}
    </div>
  );
}
