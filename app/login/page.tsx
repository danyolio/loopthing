import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect(params.next || "/app");

  return (
    <main className="min-h-dvh bg-[var(--paper)] px-5 py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back home
        </Link>
      </div>
      <section className="mx-auto grid min-h-[calc(100dvh-6rem)] max-w-6xl place-items-center py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_420px]">
          <div className="hidden max-w-xl lg:block">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal-strong)]">
              Continuous thinking, not another chat
            </p>
            <h1 className="text-6xl font-medium leading-[0.95] tracking-[-0.065em]">
              Pick up the thread.
              <br />
              Move the thinking.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-8 text-muted-foreground">
              One living document that remembers the evidence, questions, choices,
              and changes behind the work.
            </p>
          </div>
          <div className="rounded-[1.75rem] border bg-background p-7 shadow-[0_24px_80px_rgba(32,32,26,0.1)] sm:p-9">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              Enter your workspace
            </h2>
            <p className="mb-7 mt-2 text-sm leading-6 text-muted-foreground">
              Sign in to continue an existing line of thought or begin a new one.
            </p>
            {params.error && (
              <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                The sign-in link could not be verified. Please try again.
              </p>
            )}
            <AuthForm next={params.next} />
          </div>
        </div>
      </section>
    </main>
  );
}
