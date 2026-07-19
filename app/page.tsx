import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  History,
  Orbit,
  Quote,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const principles = [
  {
    icon: Orbit,
    title: "A loop, not a chat",
    body: "The work stays at the centre. AI notices material change, reconnects context, and proposes the next useful move.",
  },
  {
    icon: GitBranch,
    title: "Alternatives stay visible",
    body: "Significant changes become branches with rationale. Nothing quietly rewrites the accepted document.",
  },
  {
    icon: History,
    title: "Reasoning has history",
    body: "Sources, decisions, open questions, comments, and checkpoints explain how the thinking arrived here.",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[var(--paper)]">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/login">
              Start a project
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:pb-36">
        <div className="absolute -right-40 top-0 size-[34rem] rounded-full bg-[var(--signal)]/16 blur-[100px]" />
        <div className="relative max-w-5xl">
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--signal-strong)]">
            <Sparkles className="size-3.5" />
            A continuous-thinking workspace
          </p>
          <h1 className="max-w-5xl text-[clamp(3.6rem,9vw,8.2rem)] font-medium leading-[0.84] tracking-[-0.078em]">
            Work that
            <br />
            remembers <span className="font-serif italic text-[var(--signal-strong)]">why.</span>
          </h1>
          <div className="mt-10 flex max-w-4xl flex-col gap-8 border-l border-foreground/20 pl-6 sm:flex-row sm:items-end sm:justify-between sm:pl-8">
            <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Loop Thing is a living document for evolving problems. It keeps
              evidence, choices, contradictions, and changes connected—then
              helps the work reach its next clearer state.
            </p>
            <Button asChild size="lg" className="shrink-0 rounded-full px-6">
              <Link href="/login">
                Begin the thread
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y bg-[var(--ink)] text-[var(--paper)]">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-white/10 p-8 sm:p-12 lg:border-b-0 lg:border-r lg:p-16">
            <div className="mb-16 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
              <span>Living document</span>
              <span>Today · 10:42</span>
            </div>
            <article className="max-w-2xl">
              <p className="mb-3 text-sm text-[var(--signal)]">Current thesis</p>
              <h2 className="text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
                Teams don’t need more generated text. They need their reasoning
                to survive the week.
              </h2>
              <p className="mt-8 text-base leading-8 text-white/55">
                The product should preserve the relationship between evidence,
                claims, unresolved questions, and decisions—without asking
                people to maintain a separate knowledge system.
              </p>
              <blockquote className="mt-12 border-l-2 border-[var(--signal)] pl-5 text-sm leading-7 text-white/70">
                <Quote className="mb-3 size-4 text-[var(--signal)]" />
                “The useful unit isn’t a message. It’s the change in what the
                team can confidently decide.”
              </blockquote>
            </article>
          </div>
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Latest loop
            </p>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--signal)]/15 px-3 py-1.5 text-xs text-[var(--signal)]">
              <span className="size-1.5 rounded-full bg-[var(--signal)]" />
              Material change found
            </div>
            <h3 className="mt-6 text-2xl tracking-[-0.035em]">
              The user promise is becoming sharper.
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/55">
              Three interview notes support continuity as the core value. One
              planning assumption still treats summarisation as the main job.
            </p>
            <div className="mt-10 space-y-5 border-t border-white/10 pt-8">
              <div>
                <p className="text-xs text-white/35">Unresolved</p>
                <p className="mt-1 text-sm">When does continuity become noise?</p>
              </div>
              <div>
                <p className="text-xs text-white/35">Next useful action</p>
                <p className="mt-1 text-sm">
                  Test the “resume the thinking” moment with two active teams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal-strong)]">
            Designed around the work
          </p>
          <h2 className="mt-5 text-4xl font-medium leading-tight tracking-[-0.055em] sm:text-6xl">
            The document moves forward.
            <br />
            The context comes with it.
          </h2>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border bg-border lg:grid-cols-3">
          {principles.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="bg-background p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-[var(--signal-strong)]" />
                <span className="font-mono text-xs text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-16 text-xl font-semibold tracking-[-0.035em]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>Built for work that changes before it finishes.</p>
        </div>
      </footer>
    </main>
  );
}
