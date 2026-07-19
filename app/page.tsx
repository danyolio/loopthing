import Link from "next/link";
import {
  ArrowRight,
  CircleDot,
  FileText,
  GitBranch,
  History,
  Orbit,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const mechanics = [
  {
    icon: FileText,
    title: "The document is the memory.",
    body: "Evidence, assumptions, decisions, alternatives, and open questions stay attached to the work—not scattered through chat history.",
  },
  {
    icon: Orbit,
    title: "Loops catch what changed.",
    body: "As new facts arrive, Loop Thing tests them against earlier reasoning and shows what still holds, what broke, and why it matters.",
  },
  {
    icon: GitBranch,
    title: "You decide what becomes true.",
    body: "AI proposes. People accept. The canonical document never changes silently, and serious alternatives keep their own branch and rationale.",
  },
];

const useCases = [
  {
    label: "Strategy",
    question: "Which market can we win—and what would prove us wrong?",
  },
  {
    label: "Product planning",
    question: "Build it, sequence it, or kill it?",
  },
  {
    label: "Research",
    question: "What does the evidence support—and what remains unknown?",
  },
  {
    label: "Investment",
    question: "Does the thesis still hold after the latest results?",
  },
  {
    label: "Hiring",
    question: "Make the offer—or reopen the search?",
  },
  {
    label: "Design review",
    question: "Commit to this direction—or branch it?",
  },
  {
    label: "Long-form writing",
    question: "Is the argument getting stronger—or just longer?",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[var(--paper)]">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Primary navigation">
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

      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24 lg:pb-40">
        <div className="pointer-events-none absolute -right-40 -top-20 size-[36rem] rounded-full bg-[var(--signal)]/18 blur-[110px]" />
        <div className="relative">
          <p className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--signal-strong)]">
            <Sparkles className="size-3.5" />
            Continuous thinking. Asynchronous work.
          </p>
          <h1 className="max-w-6xl text-[clamp(3.5rem,8.7vw,8rem)] font-medium leading-[0.86] tracking-[-0.078em]">
            AI answers in seconds.
            <br />
            Hard problems take{" "}
            <span className="font-serif italic text-[var(--signal-strong)]">
              months.
            </span>
          </h1>
          <div className="mt-10 grid max-w-6xl gap-8 border-l border-foreground/20 pl-6 sm:pl-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
                <strong className="font-semibold text-foreground">
                  Loop Thing is a continuous-thinking document for hard
                  problems.
                </strong>{" "}
                It keeps working between meetings—connecting evidence,
                assumptions, decisions, alternatives, contradictions, and open
                questions as new facts arrive.
              </p>
              <p className="mt-4 text-sm font-medium text-foreground/75">
                For decisions too important to leave in a chat history.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/login">
                  Work the problem
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full bg-transparent px-6"
              >
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-8 border-y bg-[var(--ink)] text-[var(--paper)]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">
                A working model, not a summary
              </p>
              <h2 className="mt-5 text-4xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Chat answers the prompt.
                <br />
                Loop Thing stays with the problem.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-white/55 lg:justify-self-end">
              Every source, assumption, decision, and open question remains
              connected to the document. When new evidence lands, a Loop shows
              exactly what changed, why it matters, and what to do next.
            </p>
          </div>

          <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/12 bg-[#20231f] shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[0.68rem] uppercase tracking-[0.17em] text-white/38 sm:px-8">
              <span>Continuous-thinking document</span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[var(--signal)]" />
                Updated today
              </span>
            </div>
            <div className="grid lg:grid-cols-[1.16fr_0.84fr]">
              <article className="border-b border-white/10 p-6 sm:p-10 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <FileText className="size-3.5" />
                  Canonical document
                </div>
                <h3 className="mt-7 max-w-2xl text-3xl leading-tight tracking-[-0.04em] sm:text-5xl">
                  Should we move upmarket this year?
                </h3>
                <div className="mt-10 border-l-2 border-[var(--signal)] pl-5">
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/35">
                    Current decision
                  </p>
                  <p className="mt-2 max-w-xl text-base leading-7 text-white/80">
                    Do not scale sales yet. Validate a partner-led onboarding
                    model first.
                  </p>
                </div>
                <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
                  <div className="bg-[#20231f] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--signal)]">
                      New evidence
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      3 of 5 lost deals cited implementation risk—not missing
                      features.
                    </p>
                  </div>
                  <div className="bg-[#20231f] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-amber-300">
                      Assumption at risk
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      More sales capacity will unlock growth.
                    </p>
                  </div>
                  <div className="bg-[#20231f] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/38">
                      Still unresolved
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      Can partners absorb onboarding without lowering quality?
                    </p>
                  </div>
                </div>
              </article>

              <aside className="bg-[#191b18] p-6 sm:p-10">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.17em] text-white/38">
                  <Orbit className="size-3.5" />
                  Latest Loop
                </p>
                <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--signal)]/12 px-3 py-1.5 text-xs text-[var(--signal)]">
                  <CircleDot className="size-3.5" />
                  Material change found
                </div>
                <div className="mt-9 space-y-8">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.15em] text-white/32">
                      What changed
                    </p>
                    <p className="mt-2 text-lg leading-7 text-white/85">
                      The bottleneck is delivery, not demand.
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.15em] text-white/32">
                      Why it matters
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/58">
                      Scaling sales now would increase pipeline the team cannot
                      onboard well.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--signal)]/20 bg-[var(--signal)]/[0.07] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.15em] text-[var(--signal)]">
                      Next useful action
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      Price a partner-led pilot before changing the roadmap.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal-strong)]">
            Built for thinking that changes
          </p>
          <h2 className="mt-5 text-4xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl">
            The work moves.
            <br />
            The reasoning moves with it.
          </h2>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border bg-border lg:grid-cols-3">
          {mechanics.map(({ icon: Icon, title, body }, index) => (
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
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-foreground/10 bg-[#e9e6dc]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="lg:sticky lg:top-12 lg:self-start">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal-strong)]">
                Built for decisions that evolve
              </p>
              <h2 className="mt-5 max-w-lg text-4xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl">
                Use it when the answer changes as the evidence arrives.
              </h2>
            </div>
            <div className="border-t border-foreground/15">
              {useCases.map(({ label, question }, index) => (
                <article
                  key={label}
                  className="grid gap-3 border-b border-foreground/15 py-7 sm:grid-cols-[2.5rem_10rem_1fr] sm:items-baseline"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--signal-strong)]">
                    {label}
                  </p>
                  <h3 className="text-xl leading-snug tracking-[-0.03em] sm:text-2xl">
                    {question}
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-36">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--signal)] px-6 py-16 text-[var(--ink)] sm:px-12 sm:py-20 lg:px-16">
          <History className="absolute -bottom-24 -right-16 size-80 stroke-[0.5] opacity-15" />
          <div className="relative max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">
              Stop restarting the thinking
            </p>
            <h2 className="mt-5 text-5xl font-medium leading-[0.95] tracking-[-0.06em] sm:text-7xl">
              Bring the problem.
              <br />
              Keep the thinking.
            </h2>
            <p className="mt-7 max-w-2xl text-base leading-8 text-black/65 sm:text-lg">
              Start with the decision in front of you. Loop Thing keeps the
              evidence, reasoning, and unresolved questions alive until the
              work is done.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-9 rounded-full bg-[var(--ink)] px-6 text-[var(--paper)] hover:bg-[var(--ink)]/88"
            >
              <Link href="/login">
                Start a project
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>For problems that take longer than a prompt.</p>
        </div>
      </footer>
    </main>
  );
}
