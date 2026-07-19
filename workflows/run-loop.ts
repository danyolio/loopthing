import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { CORE_SYSTEM_PROMPT } from "@/lib/core-prompt";
import type { AIProvider, LoopStatus, LoopType } from "@/lib/domain";
import { log } from "@/lib/logger";
import { loopResultSchema, type LoopResult } from "@/lib/loop-schema";

export type LoopWorkflowInput = {
  loopId: string;
  projectId: string;
  loopType: LoopType;
  provider: AIProvider;
  accessToken?: string;
  scheduled: boolean;
};

type LoopContext = {
  project: Record<string, unknown>;
  document: Record<string, unknown>;
  sources: Record<string, unknown>[];
  questions: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  comments?: Record<string, unknown>[];
  branches?: Record<string, unknown>[];
  recent_loops: Record<string, unknown>[];
  new_activity?: Record<string, unknown>;
};

function supabaseClient(accessToken?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    },
  );
}

async function updateProgress(
  input: LoopWorkflowInput,
  status: LoopStatus,
  stage: string,
  percent: number,
  errorMessage?: string,
) {
  "use step";
  const supabase = supabaseClient(input.accessToken);
  if (input.scheduled) {
    const { error } = await supabase.rpc("update_scheduled_loop", {
      p_secret: process.env.CRON_SECRET!,
      p_loop_id: input.loopId,
      p_status: status,
      p_stage: stage,
      p_percent: percent,
      p_error: errorMessage ?? null,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("loop_runs")
      .update({
        status,
        progress_stage: stage,
        progress_percent: percent,
        started_at: status !== "queued" ? new Date().toISOString() : null,
        completed_at:
          status === "complete" || status === "failed"
            ? new Date().toISOString()
            : null,
        error_message: errorMessage ?? null,
      })
      .eq("id", input.loopId);
    if (error) throw error;
  }
  log("info", "loop.progress", { loopId: input.loopId, status, stage, percent });
}

async function collectContext(input: LoopWorkflowInput): Promise<LoopContext> {
  "use step";
  const supabase = supabaseClient(input.accessToken);

  if (input.scheduled) {
    const { data, error } = await supabase.rpc("get_scheduled_loop_context", {
      p_secret: process.env.CRON_SECRET!,
      p_loop_id: input.loopId,
    });
    if (error) throw error;
    return data as LoopContext;
  }

  const [project, document, sources, questions, decisions, recentLoops] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", input.projectId).single(),
      supabase
        .from("documents")
        .select("*")
        .eq("project_id", input.projectId)
        .single(),
      supabase
        .from("sources")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("questions")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("decisions")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("loop_insights")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const firstError = [
    project.error,
    document.error,
    sources.error,
    questions.error,
    decisions.error,
    recentLoops.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  return {
    project: project.data,
    document: document.data,
    sources: sources.data ?? [],
    questions: questions.data ?? [],
    decisions: decisions.data ?? [],
    recent_loops: recentLoops.data ?? [],
  };
}

async function synthesise(
  context: LoopContext,
  input: LoopWorkflowInput,
): Promise<{ result: LoopResult; provider: AIProvider; model: string }> {
  "use step";
  const projectProvider =
    context.project.ai_provider === "openai" ||
    context.project.ai_provider === "google"
      ? context.project.ai_provider
      : input.provider;
  const provider = input.scheduled ? projectProvider : input.provider;
  const model =
    provider === "openai"
      ? process.env.OPENAI_MODEL || "gpt-5.6-sol"
      : process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-3.5-flash";

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  const dailyDreamPrompt = `Run the overnight Dream over the supplied project state.

This is not a chat response or a summary. It is the quiet co-authoring pass that
happens after people have spent the day adding raw notes, sources, questions,
critiques, voice transcripts, and unfinished conjecture.

Success means:
- follow promising threads before forcing them into an outline
- push conjectures far enough to reveal what is useful, weak, or surprising
- distinguish evidence, assumptions, decisions, and unresolved questions
- preserve the authors' intent and voice while making the prose direct and exact
- omit needless words; prefer active language and memorable rhythm without ornament
- return a proposal containing the complete rewritten document in Markdown
- set proposal.isSignificantBranch to false; the previous document is preserved as a version
- bootstrap a coherent first document when the current document is nearly empty
- use summary for what became stronger
- use whyItMatters for an honest critique of what remains weak, flabby, unsupported, or unresolved
- use whatChanged for the concrete changes made to the document
- use unresolved for open questions that can keep the next day's thinking moving
- use thinkingEvolution to explain how the thesis or direction developed
- choose one compelling next thread as nextAction

Pay particular attention to new_activity, which contains contributions since the
last completed Dream. Use the rest of the state as history and context.

PROJECT STATE
${JSON.stringify(context)}`;

  const standardLoopPrompt = `Run a ${input.loopType} Loop over the supplied project state.

Success means:
- identify only material changes supported by the supplied state
- distinguish evidence, assumptions, decisions, and unresolved questions
- leave the canonical document unchanged
- propose content only when it creates a genuinely clearer next state
- when proposing content, return the complete revised canonical document in Markdown; do not return a fragment or repeat the proposal title outside the document
- use a significant branch only for a material alternative
- choose one smallest useful next action

PROJECT STATE
${JSON.stringify(context)}`;

  const prompt =
    input.scheduled && input.loopType === "daily"
      ? dailyDreamPrompt
      : standardLoopPrompt;

  const { output } = await generateText({
    model:
      provider === "openai"
        ? openai.responses(model)
        : google(model),
    system: CORE_SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: loopResultSchema }),
    maxRetries: 2,
    providerOptions:
      provider === "openai"
        ? { openai: { reasoningEffort: "medium" } }
        : undefined,
  });

  if (
    input.scheduled &&
    input.loopType === "daily" &&
    (!output.proposal || output.proposal.isSignificantBranch)
  ) {
    throw new Error("The overnight Dream did not return a complete rewrite");
  }

  return { result: output, provider, model };
}

async function persistResult(
  input: LoopWorkflowInput,
  result: LoopResult,
  provider: AIProvider,
  model: string,
) {
  "use step";
  const supabase = supabaseClient(input.accessToken);

  if (input.scheduled) {
    const { error } = await supabase.rpc("complete_scheduled_loop", {
      p_secret: process.env.CRON_SECRET!,
      p_loop_id: input.loopId,
      p_result: result,
    });
    if (error) throw error;
  } else {
    const { error: insightError } = await supabase.from("loop_insights").upsert(
      {
        loop_run_id: input.loopId,
        project_id: input.projectId,
        material_change: result.materialChange,
        summary: result.summary,
        what_changed: result.whatChanged,
        why_it_matters: result.whyItMatters,
        unresolved: result.unresolved,
        evidence: result.evidence,
        proposal: result.proposal ?? {},
        next_action: result.nextAction,
        thinking_evolution: result.thinkingEvolution,
      },
      { onConflict: "loop_run_id" },
    );
    if (insightError) throw insightError;

    const { error: runError } = await supabase
      .from("loop_runs")
      .update({
        status: "complete",
        progress_stage: "Complete",
        progress_percent: 100,
        provider,
        model,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", input.loopId);
    if (runError) throw runError;
  }

  log("info", "loop.complete", {
    loopId: input.loopId,
    projectId: input.projectId,
    provider,
    model,
    materialChange: result.materialChange,
  });
}

export async function runLoopWorkflow(input: LoopWorkflowInput) {
  "use workflow";

  try {
    await updateProgress(input, "collecting", "Collecting project context", 15);
    const context = await collectContext(input);
    await updateProgress(input, "analysing", "Connecting changes and evidence", 40);
    await updateProgress(input, "synthesising", "Synthesising the next clearer state", 65);
    const synthesis = await synthesise(context, input);
    await updateProgress(input, "saving", "Saving structured insight", 88);
    await persistResult(
      input,
      synthesis.result,
      synthesis.provider,
      synthesis.model,
    );
    return { loopId: input.loopId, status: "complete" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Loop failure";
    await updateProgress(input, "failed", "Stopped safely", 100, message);
    return { loopId: input.loopId, status: "failed" as const, error: message };
  }
}
