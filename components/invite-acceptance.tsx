"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function InviteAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    const { data, error } = await createClient().rpc("accept_invitation", {
      p_token: token,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(`/app/projects/${data}`);
    router.refresh();
  }

  return (
    <Button size="lg" onClick={accept} disabled={loading}>
      {loading ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
      Join project
    </Button>
  );
}
