import { notFound, redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import type { WorkspaceData } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect(`/login?next=/app/projects/${projectId}`);

  const [
    projectResult,
    documentResult,
    memberResult,
    profileResult,
    sourcesResult,
    questionsResult,
    decisionsResult,
    commentsResult,
    branchesResult,
    checkpointsResult,
    runsResult,
    insightsResult,
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("documents").select("*").eq("project_id", projectId).single(),
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authData.user.id)
      .single(),
    supabase.from("profiles").select("display_name").eq("id", authData.user.id).single(),
    supabase
      .from("sources")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("questions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("decisions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("branches")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("yjs_checkpoints")
      .select("id,plain_text,reason,sequence,created_at,created_by")
      .eq("project_id", projectId)
      .order("sequence", { ascending: false })
      .limit(30),
    supabase
      .from("loop_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("loop_insights")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (
    projectResult.error ||
    documentResult.error ||
    memberResult.error ||
    !projectResult.data ||
    !documentResult.data
  ) {
    notFound();
  }

  const data: WorkspaceData = {
    project: projectResult.data,
    document: documentResult.data,
    role: memberResult.data.role,
    user: {
      id: authData.user.id,
      email: authData.user.email ?? "",
      displayName:
        profileResult.data?.display_name ||
        authData.user.email?.split("@")[0] ||
        "Collaborator",
    },
    sources: sourcesResult.data ?? [],
    questions: questionsResult.data ?? [],
    decisions: decisionsResult.data ?? [],
    comments: commentsResult.data ?? [],
    branches: branchesResult.data ?? [],
    checkpoints: checkpointsResult.data ?? [],
    runs: runsResult.data ?? [],
    insights: insightsResult.data ?? [],
  } as WorkspaceData;

  return <Workspace initialData={data} />;
}
