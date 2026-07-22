import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { FatalError } from "workflow";
import { resolveAIModel } from "@/lib/ai-models";
import { CORE_SYSTEM_PROMPT } from "@/lib/core-prompt";
import type { AIProvider, LoopStatus, LoopType } from "@/lib/domain";
import { formatLoopFailure, loopErrorMetadata } from "@/lib/loop-errors";
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
  reasoning_nodes?: Record<string, unknown>[];
  reasoning_edges?: Record<string, unknown>[];
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
  log(status === "failed" ? "error" : "info", "loop.progress", {
    loopId: input.loopId,
    projectId: input.projectId,
    status,
    stage,
    percent,
    errorMessage,
  });
}

async function collectContext(input: LoopWorkflowInput): Promise<LoopContext> {
  "use step";
  const supabase = supabaseClient(input.accessToken);

  if (input.scheduled) {
    const [baseResult, reasoningResult] = await Promise.all([
      supabase.rpc("get_scheduled_loop_context", {
        p_secret: process.env.CRON_SECRET!,
        p_loop_id: input.loopId,
      }),
      supabase.rpc("get_scheduled_reasoning_context", {
        p_secret: process.env.CRON_SECRET!,
        p_loop_id: input.loopId,
      }),
    ]);
    if (baseResult.error) throw baseResult.error;
    if (reasoningResult.error) throw reasoningResult.error;
    const base = baseResult.data as LoopContext;
    const reasoning = reasoningResult.data as {
      reasoning_nodes?: Record<string, unknown>[];
      reasoning_edges?: Record<string, unknown>[];
      new_reasoning_activity?: Record<string, unknown>[];
    };
    return {
      ...base,
      reasoning_nodes: reasoning.reasoning_nodes ?? [],
      reasoning_edges: reasoning.reasoning_edges ?? [],
      new_activity: {
        ...(base.new_activity ?? {}),
        reasoning: reasoning.new_reasoning_activity ?? [],
      },
    };
  }

  const [
    project,
    document,
    sources,
    questions,
    decisions,
    comments,
    branches,
    reasoningNodes,
    reasoningEdges,
    recentLoops,
  ] = await Promise.all([
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
        .from("comments")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("branches")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reasoning_nodes")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: true })
        .limit(120),
      supabase
        .from("reasoning_edges")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: true })
        .limit(200),
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
    comments.error,
    branches.error,
    reasoningNodes.error,
    reasoningEdges.error,
    recentLoops.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  return {
    project: project.data,
    document: document.data,
    sources: sources.data ?? [],
    questions: questions.data ?? [],
    decisions: decisions.data ?? [],
    comments: comments.data ?? [],
    branches: branches.data ?? [],
    reasoning_nodes: reasoningNodes.data ?? [],
    reasoning_edges: reasoningEdges.data ?? [],
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
  const model = resolveAIModel(provider);

  if (input.scheduled) {
    const { error } = await supabaseClient().rpc("record_scheduled_loop_runtime", {
      p_secret: process.env.CRON_SECRET!,
      p_loop_id: input.loopId,
      p_provider: provider,
      p_model: model,
    });
    if (error) throw error;
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new FatalError("OPENAI_API_KEY is not configured");
  }
  if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new FatalError("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  const dailyDreamPrompt = `Run the overnight Dream over the supplied project state.

This is not a chat response or a summary. It is the quiet co-authoring pass that
happens after people have spent the day adding raw notes, sources, questions,
critiques, voice transcripts, and unfinished conjecture.

Success means:
- follow promising threads before forcing them into an outline
- push conjectures far enough to reveal what is useful, weak, or surprising
- make conjecture and criticism the primary work of the Dream; rewriting is secondary
- use critiqueComments for 3 to 10 consequential interventions when the material supports them
- include specific positive criticism through strength comments that explain what works and what should be protected
- use passage comments for exact sentences, section comments for a named part, and document comments for broad editorial judgment
- for passage comments, anchorText must be an exact verbatim quote from the document the person will review
- for section comments, sectionTitle must match the heading exactly
- ask questions that could unlock the work, not questions that merely request more detail
- do not manufacture a full rewrite when thoughtful comments would advance the work more honestly
- distinguish evidence, assumptions, decisions, and unresolved questions
- preserve the authors' intent and voice while making the prose direct and exact
- omit needless words; prefer active language and memorable rhythm without ornament
- proposal may be null; return a complete rewritten document only when the accumulated thinking genuinely warrants a new state
- when proposal is not null, set proposal.isSignificantBranch to false and anchor critiqueComments to that proposed document because it is what the person will review
- when proposal is null, anchor critiqueComments to the current canonical document
- bootstrap a coherent first document when the current document is nearly empty
- use summary for what became stronger
- use whyItMatters for an honest critique of what remains weak, flabby, unsupported, or unresolved
- use whatChanged for the concrete changes made to the document
- use changeAttribution.directives only for changes traceable to explicit human notes, feedback, decisions, questions, or direct edits
- compare the current document with the latest supplied Dream proposal; treat passages people deleted or rewrote as direction, and do not casually resurrect them
- use changeAttribution.independent for editorial or analytical choices you made without an explicit instruction
- use changeAttribution.preserved for important arguments, passages, or constraints you intentionally left intact
- use changeDetails to connect each material rewrite to a short excerpt, its reason, its provenance, and the exact source IDs that prompted it
- use unresolved for open questions that can keep the next day's thinking moving
- use thinkingEvolution to explain how the thesis or direction developed
- return a compact reasoning graph of the active goals, evidence, claims, assumptions, contradictions, risks, questions, decisions, and smallest useful experiments
- use the exact decision id from PROJECT STATE when new evidence puts a recorded decision at risk; otherwise decisionId must be null
- create decisionAlerts only when supplied evidence genuinely triggers a recorded reconsideration condition or undermines a material assumption
- choose one compelling next thread as nextAction

Pay particular attention to new_activity, which contains contributions since the
last completed Dream. Use the rest of the state as history and context.

PROJECT STATE
${JSON.stringify(context)}`;

  const standardLoopPrompt = `Run a ${input.loopType} Loop over the supplied project state.

Success means:
- identify only material changes supported by the supplied state
- make conjecture and criticism the primary intervention
- return specific positive criticism as well as challenges, questions, tensions, connections, and possibilities
- put feedback at the right level through critiqueComments: exact passage, named section, or whole document
- use exact verbatim anchorText for passage comments and exact sectionTitle for section comments
- distinguish evidence, assumptions, decisions, and unresolved questions
- leave the canonical document unchanged
- propose content only when it creates a genuinely clearer next state; a useful Loop may return comments with no rewrite
- identify which changes follow explicit human direction, which are your own editorial choices, and what you intentionally preserved
- compare the current document with the latest supplied Dream proposal; treat passages people deleted or rewrote as direction, and do not casually resurrect them
- use changeDetails to explain the provenance and source IDs behind each material proposed change
- return a compact reasoning graph rather than a flat summary
- flag recorded decisions only when new evidence actually undermines their assumptions or reconsideration conditions
- when proposing content, return the complete revised canonical document in Markdown; do not return a fragment or repeat the proposal title outside the document
- use a significant branch only for a material alternative
- choose one smallest useful next action

PROJECT STATE
${JSON.stringify(context)}`;

  const prompt =
    input.scheduled && input.loopType === "daily"
      ? dailyDreamPrompt
      : standardLoopPrompt;

  log("info", "loop.synthesis.started", {
    loopId: input.loopId,
    projectId: input.projectId,
    provider,
    model,
    scheduled: input.scheduled,
    loopType: input.loopType,
  });

  let output: LoopResult;
  try {
    ({ output } = await generateText({
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
    }));
  } catch (error) {
    const message = formatLoopFailure(error, {
      stage: "AI synthesis",
      provider,
      model,
    });
    log("error", "loop.synthesis.failed", {
      loopId: input.loopId,
      projectId: input.projectId,
      provider,
      model,
      ...loopErrorMetadata(error),
    });
    // generateText already applies its own bounded retries. Do not let the
    // workflow engine multiply those model calls by retrying the whole step.
    throw new FatalError(message);
  }

  if (
    input.scheduled &&
    input.loopType === "daily" &&
    !output.proposal &&
    output.critiqueComments.length === 0
  ) {
    throw new FatalError(
      "The overnight Dream returned neither critique nor a proposal",
    );
  }
  if (
    input.scheduled &&
    input.loopType === "daily" &&
    output.proposal?.isSignificantBranch
  ) {
    throw new FatalError(
      "The overnight Dream returned a branch instead of a reviewable document",
    );
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
        change_attribution: result.changeAttribution,
        change_details: result.changeDetails,
        reasoning_model: result.reasoning,
        decision_alerts: result.decisionAlerts,
        critique_comments: result.critiqueComments,
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

  let failureStage = "startup";
  try {
    failureStage = "project context collection";
    await updateProgress(input, "collecting", "Collecting project context", 15);
    const context = await collectContext(input);
    failureStage = "analysis";
    await updateProgress(input, "analysing", "Reading for strengths, tensions, and openings", 40);
    await updateProgress(input, "synthesising", "Developing conjecture and criticism", 65);
    failureStage = "AI synthesis";
    const synthesis = await synthesise(context, input);
    failureStage = "result persistence";
    await updateProgress(input, "saving", "Saving structured insight", 88);
    await persistResult(
      input,
      synthesis.result,
      synthesis.provider,
      synthesis.model,
    );
    return { loopId: input.loopId, status: "complete" as const };
  } catch (error) {
    const message = formatLoopFailure(error, {
      stage: failureStage,
      provider: input.provider,
    });
    await updateProgress(input, "failed", "Stopped safely", 100, message);
    // Keep the database status user-readable while also making the durable
    // workflow ledger accurately report a failed run.
    throw new Error(message);
  }
}
