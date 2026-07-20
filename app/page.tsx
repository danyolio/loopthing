import Link from "next/link";
import {
  ArrowRight,
  FileText,
  History,
  MessageSquareText,
  Moon,
  Sunrise,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const mechanics = [
  {
    icon: MessageSquareText,
    title: "Drop unfinished thinking.",
    body: "Add notes, sources, questions, loose conjecture, and voice transcripts whenever they arrive. No prompt or polished brief required.",
  },
  {
    icon: Moon,
    title: "Loopthing dreams overnight.",
    body: "It follows the new threads, tests them against what came before, critiques weak reasoning, and rewrites the whole document.",
  },
  {
    icon: Sunrise,
    title: "Review what changed.",
    body: "Keep or revert each Dream change, leave feedback for the next night, or preserve the alternative as a branch. The reasoning and every earlier version remain intact.",
  },
];

const useCases = [
  {
    label: "Strategy",
    question: "Which market can we win—and what would prove us wrong?",
  },
  {
    label: "Planning",
    question: "What should happen next, in what order, and why?",
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
    question: "What is this essay, article, or blog post really arguing?",
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
          <h1 className="max-w-6xl text-[clamp(3.15rem,7.2vw,6.75rem)] font-medium leading-[0.9] tracking-[-0.067em]">
            Great work isn’t generated.
            <br />
            <span className="font-serif italic text-[var(--signal-strong)]">
              It’s developed.
            </span>
          </h1>
          <div className="mt-10 grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
                <strong className="font-semibold text-foreground">
                  Loopthing is an async workspace for work that needs time to
                  develop.
                </strong>{" "}
                Work alone or with a team. Drop notes, sources, questions, and
                loose conjecture as they come. Loopthing stays quiet by day,
                then dreams on the new material overnight. Wake up to a
                rewritten document, an honest critique, and new questions.
                Every version is preserved.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/login">
                  Start a project
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
                The daily rhythm
              </p>
              <h2 className="mt-5 text-4xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Think freely by day.
                <br />
                Wake up to developed work.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-white/55 lg:justify-self-end">
              Most tools ask for a clean prompt. Loopthing gives unfinished
              work time to accumulate, connect, and change. It does the
              synthesis overnight, after the day’s thinking is done.
            </p>
          </div>

          <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/12 bg-[#20231f] shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[0.68rem] uppercase tracking-[0.17em] text-white/38 sm:px-8">
              <span>Long-form writing</span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[var(--signal)]" />
                Next Dream in 7h 42m
              </span>
            </div>
            <div className="grid lg:grid-cols-[1.16fr_0.84fr]">
              <article className="border-b border-white/10 p-6 sm:p-10 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <FileText className="size-3.5" />
                  Today’s working document
                </div>
                <h3 className="mt-7 max-w-2xl text-3xl leading-tight tracking-[-0.04em] sm:text-5xl">
                  The first idea is rarely the finished one.
                </h3>
                <div className="mt-10 border-l-2 border-white/15 pl-5">
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/35">
                    Current thesis
                  </p>
                  <p className="mt-2 max-w-xl text-base leading-7 text-white/80">
                    Great work does not appear fully formed. It develops through
                    fragments, contradiction, time, and return.
                  </p>
                </div>
                <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
                  <div className="bg-[#20231f] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--signal)]">
                      Loose conjecture
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      Maybe incubation is not inactivity. Maybe it is part of
                      the work.
                    </p>
                  </div>
                  <div className="bg-[#20231f] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/38">
                      Voice note
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      “I know this matters. I don’t know the argument yet.”
                    </p>
                  </div>
                  <div className="bg-[#20231f] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/38">
                      Question
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      What can only become clear after we stop forcing an
                      answer?
                    </p>
                  </div>
                </div>
              </article>

              <aside className="bg-[#191b18] p-6 sm:p-10">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.17em] text-white/38">
                  <Moon className="size-3.5" />
                  Overnight Dream report
                </p>
                <div className="mt-9 space-y-8">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.15em] text-white/32">
                      What became stronger
                    </p>
                    <p className="mt-2 text-lg leading-7 text-white/85">
                      The piece now argues that incubation is a working method,
                      not a delay.
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.15em] text-white/32">
                      Honest critique
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/58">
                      The opening still treats speed as the enemy. The sharper
                      contrast is between instant output and developed judgment.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--signal)]/20 bg-[var(--signal)]/[0.07] p-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.15em] text-[var(--signal)]">
                      Question for today
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      What does slow thinking make possible that another prompt
                      cannot?
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/38">
                    <span>Version 08 preserved</span>
                    <span className="text-[var(--signal)]">Version 09 current</span>
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
            Day, night, morning
          </p>
          <h2 className="mt-5 text-4xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl">
            The work changes.
            <br />
            The history stays.
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
                Built for work that develops
              </p>
              <h2 className="mt-5 max-w-lg text-4xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl">
                Use it when one sitting is not enough.
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
              Leave something unfinished
            </p>
            <h2 className="mt-5 text-5xl font-medium leading-[0.95] tracking-[-0.06em] sm:text-7xl">
              Give the work
              <br />
              another night.
            </h2>
            <p className="mt-7 max-w-2xl text-base leading-8 text-black/65 sm:text-lg">
              Start with a rough thought, a difficult decision, or a blank
              document. Add to it when ideas arrive. Loopthing will keep the
              thread and move the work forward overnight.
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
          <p>For work that needs time to develop.</p>
        </div>
      </footer>
    </main>
  );
}
