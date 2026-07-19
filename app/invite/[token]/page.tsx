import Link from "next/link";
import { redirect } from "next/navigation";
import { InviteAcceptance } from "@/components/invite-acceptance";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--paper)] px-5">
      <section className="w-full max-w-lg rounded-3xl border bg-background p-8 text-center shadow-[0_24px_80px_rgba(32,32,26,0.1)] sm:p-12">
        <Logo />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--signal-strong)]">
          Collaboration invitation
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.055em]">
          Pick up the thread together.
        </h1>
        <p className="mx-auto mb-8 mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
          Accept to join the project with the role chosen by its owner. Your
          access remains protected by project-level permissions.
        </p>
        <InviteAcceptance token={token} />
        <Button asChild variant="ghost" className="mt-3">
          <Link href="/app">Not now</Link>
        </Button>
      </section>
    </main>
  );
}
