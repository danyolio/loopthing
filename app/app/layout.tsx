import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <div className="min-h-dvh bg-[var(--paper)]">
      <header className="sticky top-0 z-40 border-b bg-[color:var(--paper)/0.92] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <Logo />
            <Link
              href="/app"
              className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:flex"
            >
              <LayoutGrid className="size-4" />
              Projects
            </Link>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
