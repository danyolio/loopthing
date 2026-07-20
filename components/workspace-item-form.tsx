"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { ItemKind } from "@/lib/workspace-items";

export type { ItemKind } from "@/lib/workspace-items";

export function WorkspaceItemForm({
  kind,
  projectId,
  documentId,
  userId,
  currentContent,
  onCreated,
}: {
  kind: ItemKind;
  projectId: string;
  documentId: string;
  userId: string;
  currentContent: string;
  onCreated: (kind: ItemKind, item: Record<string, unknown>) => void;
}) {
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const labels = {
    source: ["Source title or claim", "URL, excerpt, or note"],
    question: ["Open question", "Why it matters"],
    decision: ["Decision or proposal", "Rationale"],
    comment: ["Feedback, direction, loose note, or conjecture", "Optional context"],
    branch: ["Branch title", "Why this alternative matters"],
  } as const;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const supabase = createClient();
    let request;

    if (kind === "source") {
      let storagePath: string | null = null;
      if (file) {
        storagePath = `${projectId}/${crypto.randomUUID()}-${file.name.replaceAll("/", "-")}`;
        const { error: uploadError } = await supabase.storage
          .from("loopthing-attachments")
          .upload(storagePath, file, { upsert: false });
        if (uploadError) {
          setSaving(false);
          toast.error(uploadError.message);
          return;
        }
      }
      const isUrl = /^https?:\/\//i.test(secondary.trim());
      request = supabase
        .from("sources")
        .insert({
          project_id: projectId,
          title: primary.trim() || file?.name || "Source",
          url: !file && isUrl ? secondary.trim() : null,
          excerpt: !file && !isUrl ? secondary.trim() : "",
          storage_path: storagePath,
          source_type: file ? "file" : isUrl ? "link" : "note",
          created_by: userId,
        })
        .select("*")
        .single();
    } else if (kind === "question") {
      request = supabase
        .from("questions")
        .insert({
          project_id: projectId,
          statement: primary.trim(),
          why_it_matters: secondary.trim(),
          created_by: userId,
        })
        .select("*")
        .single();
    } else if (kind === "decision") {
      request = supabase
        .from("decisions")
        .insert({
          project_id: projectId,
          statement: primary.trim(),
          rationale: secondary.trim(),
          created_by: userId,
        })
        .select("*")
        .single();
    } else if (kind === "comment") {
      request = supabase
        .from("comments")
        .insert({
          project_id: projectId,
          document_id: documentId,
          body: [primary.trim(), secondary.trim()].filter(Boolean).join("\n\n"),
          author_id: userId,
        })
        .select("*")
        .single();
    } else {
      request = supabase
        .from("branches")
        .insert({
          project_id: projectId,
          document_id: documentId,
          title: primary.trim(),
          rationale: secondary.trim(),
          proposed_content_text: currentContent,
          created_by: userId,
        })
        .select("*")
        .single();
    }

    const { data, error } = await request;
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not save this item.");
      return;
    }

    setPrimary("");
    setSecondary("");
    setFile(null);
    onCreated(kind, data);
    toast.success(
      `${
        kind === "comment"
          ? "Note"
          : `${kind[0].toUpperCase()}${kind.slice(1)}`
      } saved.`,
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <Input
        value={primary}
        onChange={(event) => setPrimary(event.target.value)}
        placeholder={labels[kind][0]}
        required={kind !== "source" || !file}
      />
      <Textarea
        value={secondary}
        onChange={(event) => setSecondary(event.target.value)}
        placeholder={labels[kind][1]}
        rows={2}
        required={(kind === "source" && !file) || kind === "branch"}
      />
      {kind === "source" && (
        <Input
          type="file"
          accept=".pdf,.txt,.md,.json,image/png,image/jpeg,image/webp,audio/mpeg,audio/mp4,video/mp4"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      )}
      <Button size="sm" disabled={saving}>
        {saving && <LoaderCircle className="animate-spin" />}
        Save {kind === "comment" ? "note" : kind}
      </Button>
    </form>
  );
}
