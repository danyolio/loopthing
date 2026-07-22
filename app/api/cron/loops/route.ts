import { start } from "workflow/api";
import { resolveAIModel } from "@/lib/ai-models";
import type { AIProvider } from "@/lib/domain";
import { formatLoopFailure, loopErrorMetadata } from "@/lib/loop-errors";
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

  const outcomes = await Promise.all(
    (runs ?? []).map(async (run: Record<string, unknown>) => {
      const loopId = String(run.id);
      const projectId = String(run.project_id);
      const provider: AIProvider = run.provider === "openai" ? "openai" : "google";
      try {
        const workflowRun = await start(runLoopWorkflow, [
          {
            loopId,
            projectId,
            loopType: run.loop_type as "daily" | "weekly",
            provider,
            scheduled: true,
          },
        ]);
        const { error: linkError } = await supabase.rpc(
          "record_scheduled_loop_workflow",
          {
            p_secret: process.env.CRON_SECRET!,
            p_loop_id: loopId,
            p_workflow_run_id: workflowRun.runId,
          },
        );
        if (linkError) {
          log("error", "cron.workflow_link_failed", {
            loopId,
            projectId,
            workflowRunId: workflowRun.runId,
            errorMessage: linkError.message,
          });
        }
        return {
          status: "started" as const,
          loopId,
          workflowRunId: workflowRun.runId,
        };
      } catch (startError) {
        const message = formatLoopFailure(startError, {
          stage: "workflow startup",
          provider,
          model: resolveAIModel(provider),
        });
        const { error: updateError } = await supabase.rpc(
          "update_scheduled_loop",
          {
            p_secret: process.env.CRON_SECRET!,
            p_loop_id: loopId,
            p_status: "failed",
            p_stage: "Could not start",
            p_percent: 100,
            p_error: message,
          },
        );
        log("error", "cron.workflow_start_failed", {
          loopId,
          projectId,
          provider,
          updateError: updateError?.message,
          ...loopErrorMetadata(startError),
        });
        return { status: "failed" as const, loopId, error: message };
      }
    }),
  );

  const started = outcomes.filter((outcome) => outcome.status === "started");
  const failed = outcomes.filter((outcome) => outcome.status === "failed");
  log("info", "cron.loops_started", {
    count: started.length,
    failed: failed.length,
  });
  return Response.json({ started, failed });
}
