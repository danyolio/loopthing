"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { LoaderCircle, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createHumanTextCommentAnchor,
  type HumanTextCommentAnchor,
} from "@/lib/human-comments";

export function InlineCommentComposer({
  editor,
  onSubmit,
}: {
  editor: Editor;
  onSubmit: (
    body: string,
    anchor: HumanTextCommentAnchor,
  ) => Promise<boolean>;
}) {
  const [anchor, setAnchor] = useState<HumanTextCommentAnchor | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  function beginComment() {
    const { from, to } = editor.state.selection;
    setAnchor(createHumanTextCommentAnchor(editor.state.doc, from, to));
  }

  function reset() {
    setAnchor(null);
    setBody("");
  }

  async function save() {
    if (!anchor || !body.trim()) return;
    setSaving(true);
    const saved = await onSubmit(body.trim(), anchor);
    setSaving(false);
    if (saved) reset();
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="human-inline-comment-menu"
      updateDelay={0}
      shouldShow={({ state, from, to }) =>
        from !== to &&
        Boolean(state.doc.textBetween(from, to, "\n").trim()) &&
        state.doc.textBetween(from, to, "\n").length <= 2000
      }
      options={{ placement: "top", offset: 8 }}
      className="rounded-xl border border-emerald-600/20 bg-background p-2 shadow-xl"
    >
      {anchor ? (
        <div className="w-72 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 border-l-2 border-emerald-400 pl-2 text-xs italic leading-5 text-muted-foreground">
              “{anchor.quote}”
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Cancel comment"
              onClick={reset}
            >
              <X />
            </Button>
          </div>
          <Textarea
            autoFocus
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void save();
              }
            }}
            aria-label="Comment on selected text"
            placeholder="What do you want to say about this?"
            rows={3}
          />
          <Button
            type="button"
            size="sm"
            className="w-full bg-emerald-700 text-white hover:bg-emerald-800"
            disabled={saving || !body.trim()}
            onClick={() => void save()}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <MessageSquarePlus />
            )}
            Add comment
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="bg-emerald-700 text-white hover:bg-emerald-800"
          onMouseDown={(event) => event.preventDefault()}
          onClick={beginComment}
        >
          <MessageSquarePlus />
          Comment
        </Button>
      )}
    </BubbleMenu>
  );
}
