import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const [{ data: run, error }, { data: insight }] = await Promise.all([
    supabase.from("loop_runs").select("*").eq("id", runId).single(),
    supabase
      .from("loop_insights")
      .select("*")
      .eq("loop_run_id", runId)
      .maybeSingle(),
  ]);
  if (error || !run) {
    return Response.json({ error: "Loop not found" }, { status: 404 });
  }
  return Response.json({ run, insight });
}
