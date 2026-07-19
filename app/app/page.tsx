import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, FileText, Orbit } from "lucide-react";
import { ProjectCreator } from "@/components/project-creator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: templates }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,description,status,updated_at,ai_provider")
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_templates")
      .select("slug,title,description,initial_document")
      .order("title"),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal-strong)]">
            Your workspace
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">
            Lines of thought
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
            Return to the work with its context intact—evidence, decisions,
            questions, and all.
          </p>
        </div>
        <ProjectCreator templates={templates ?? []} />
      </div>

      {projects?.length ? (
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              href={`/app/projects/${project.id}`}
              key={project.id}
              className="group rounded-2xl border bg-background p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_18px_50px_rgba(32,32,26,0.08)]"
            >
              <div className="flex items-start justify-between gap-5">
                <span className="grid size-11 place-items-center rounded-xl bg-muted">
                  <FileText className="size-5" />
                </span>
                <ArrowUpRight className="size-5 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <h2 className="mt-8 text-xl font-semibold tracking-[-0.035em]">
                {project.title}
              </h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {project.description || "A living problem, ready to be worked."}
              </p>
              <div className="mt-6 flex items-center justify-between">
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <Orbit className="size-3" />
                  {project.ai_provider === "openai" ? "OpenAI" : "Gemini"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(new Date(project.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="mt-12 grid min-h-80 place-items-center rounded-3xl border border-dashed bg-background/55 text-center">
          <div className="max-w-sm px-6">
            <Orbit className="mx-auto size-9 text-[var(--signal-strong)]" />
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.035em]">
              Nothing to resume yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start with a question, decision, thesis, plan, or piece of work
              whose thinking will keep changing.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
