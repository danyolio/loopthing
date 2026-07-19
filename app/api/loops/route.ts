import { start } from "workflow/api";
import { startLoopSchema } from "@/lib/loop-schema";
import { log } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { runLoopWorkflow } from "@/workflows/run-loop";

export async function POST(request: Request) {
  const parsed = startLoopSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid Loop request" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: authData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  if (!authData.user || !sessionData.session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", authData.user.id)
    .single();
  if (!membership || membership.role === "viewer") {
    return Response.json({ error: "Editor access required" }, { status: 403 });
  }

  const provider = parsed.data.provider || "google";
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OpenAI is ready in the app, but OPENAI_API_KEY is not configured yet." },
      { status: 503 },
    );
  }
  if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      {
        error:
          "Gemini is ready in the app, but GOOGLE_GENERATIVE_AI_API_KEY is not configured yet.",
      },
      { status: 503 },
    );
  }

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("loop_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data.projectId)
    .gte("created_at", oneMinuteAgo);
  if ((count ?? 0) >= 5) {
    return Response.json(
      { error: "Please let the current Loops finish before starting another." },
      { status: 429 },
    );
  }

  const model =
    provider === "openai"
      ? process.env.OPENAI_MODEL || "gpt-5.6-sol"
      : process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-3.5-flash";
  const idempotencyKey = `manual:${parsed.data.projectId}:${authData.user.id}:${crypto.randomUUID()}`;
  const { data: loopRun, error: insertError } = await supabase
    .from("loop_runs")
    .insert({
      project_id: parsed.data.projectId,
      loop_type: parsed.data.loopType,
      idempotency_key: idempotencyKey,
      triggered_by: authData.user.id,
      provider,
      model,
    })
    .select("*")
    .single();
  if (insertError || !loopRun) {
    return Response.json(
      { error: insertError?.message || "Could not queue the Loop." },
      { status: 500 },
    );
  }

  try {
    const workflowRun = await start(runLoopWorkflow, [
      {
        loopId: loopRun.id,
        projectId: parsed.data.projectId,
        loopType: parsed.data.loopType,
        provider,
        accessToken: sessionData.session.access_token,
        scheduled: false,
      },
    ]);
    await supabase
      .from("loop_runs")
      .update({ workflow_run_id: workflowRun.runId })
      .eq("id", loopRun.id);
    log("info", "loop.queued", {
      loopId: loopRun.id,
      workflowRunId: workflowRun.runId,
      provider,
      model,
    });
    return Response.json({
      run: { ...loopRun, workflow_run_id: workflowRun.runId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow start failed";
    await supabase
      .from("loop_runs")
      .update({
        status: "failed",
        progress_stage: "Could not start",
        progress_percent: 100,
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", loopRun.id);
    log("error", "loop.start_failed", { loopId: loopRun.id, error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
