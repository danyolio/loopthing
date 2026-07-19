import { start } from "workflow/api";
import { log } from "@/lib/logger";
import { createCronClient } from "@/lib/supabase/server";
import { runLoopWorkflow } from "@/workflows/run-loop";

export async function GET(request: Request) {
  const supplied = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || supplied !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createCronClient();
  const { data: runs, error } = await supabase.rpc("claim_due_loop_runs", {
    p_secret: process.env.CRON_SECRET,
  });
  if (error) {
    log("error", "cron.claim_failed", { error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }

  const started = await Promise.all(
    (runs ?? []).map(async (run: Record<string, unknown>) => {
      const workflowRun = await start(runLoopWorkflow, [
        {
          loopId: String(run.id),
          projectId: String(run.project_id),
          loopType: run.loop_type as "daily" | "weekly",
          provider: (run.provider === "openai" ? "openai" : "google") as
            | "openai"
            | "google",
          scheduled: true,
        },
      ]);
      return { loopId: run.id, workflowRunId: workflowRun.runId };
    }),
  );

  log("info", "cron.loops_started", { count: started.length });
  return Response.json({ started });
}
