"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Template = {
  slug: string;
  title: string;
  description: string;
  initial_document: string;
};

export function ProjectCreator({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: userData.user.id,
        title: title.trim(),
        description: description.trim(),
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Project creation failed.");
      return;
    }

    await supabase
      .from("documents")
      .update({
        content_text:
          template?.initial_document ??
          `# ${title.trim()}\n\nDrop unfinished thoughts here. The first Dream will begin developing them overnight.`,
      })
      .eq("project_id", data.id);

    setOpen(false);
    router.push(`/app/projects/${data.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-[-0.04em]">
            Start a line of thought
          </DialogTitle>
          <DialogDescription>
            Start empty or use a light structure. Rough thinking is welcome.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6 pt-2" onSubmit={createProject}>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTemplate(null)}
              className={`rounded-xl border p-4 text-left transition ${
                template === null
                  ? "border-foreground bg-foreground text-background"
                  : "hover:border-foreground/40 hover:bg-muted/50"
              }`}
            >
              <span className="text-sm font-semibold">Blank project</span>
              <span
                className={`mt-1 block text-xs leading-5 ${
                  template === null
                    ? "text-background/65"
                    : "text-muted-foreground"
                }`}
              >
                Drop raw fragments first. The first Dream will begin shaping
                the document overnight.
              </span>
            </button>
            {templates.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setTemplate(item)}
                className={`rounded-xl border p-4 text-left transition ${
                  template?.slug === item.slug
                    ? "border-foreground bg-foreground text-background"
                    : "hover:border-foreground/40 hover:bg-muted/50"
                }`}
              >
                <span className="text-sm font-semibold">{item.title}</span>
                <span
                  className={`mt-1 block text-xs leading-5 ${
                    template?.slug === item.slug
                      ? "text-background/65"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.description}
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-title">Project title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The decision or outcome you’re moving toward"
              minLength={1}
              maxLength={160}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Why this matters</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this work trying to become? A sentence is enough."
              rows={3}
            />
          </div>
          <Button className="w-full" disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
            Start project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
