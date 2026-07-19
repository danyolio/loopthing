"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ next = "/app" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);

  async function signInWithEmail(event: React.FormEvent) {
    event.preventDefault();
    setLoading("email");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for a secure sign-in link.");
  }

  async function signInWithGoogle() {
    setLoading("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setLoading(null);
      toast.error(error.message);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={signInWithEmail} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Button className="w-full" disabled={Boolean(loading)}>
          {loading === "email" && <LoaderCircle className="animate-spin" />}
          Email me a sign-in link
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={Boolean(loading)}
        onClick={signInWithGoogle}
      >
        {loading === "google" && <LoaderCircle className="animate-spin" />}
        Continue with Google
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        No password. Your work stays private to the projects you join.
      </p>
    </div>
  );
}
