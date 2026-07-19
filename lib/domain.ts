export type ProjectRole = "owner" | "editor" | "viewer";
export type LoopType = "light" | "daily" | "weekly";
export type AIProvider = "google" | "openai";
export type LoopStatus =
  | "queued"
  | "collecting"
  | "analysing"
  | "synthesising"
  | "saving"
  | "complete"
  | "failed";

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  status: string;
  ai_provider: AIProvider;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  project_id: string;
  title: string;
  content_text: string;
  current_checkpoint_id: string | null;
  updated_at: string;
};

export type ThinkingItem = {
  id: string;
  created_at: string;
  [key: string]: unknown;
};

export type LoopRun = {
  id: string;
  project_id: string;
  loop_type: LoopType;
  status: LoopStatus;
  progress_stage: string;
  progress_percent: number;
  provider?: AIProvider;
  model?: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type LoopInsight = {
  id: string;
  loop_run_id: string;
  material_change: boolean;
  summary: string;
  what_changed: unknown;
  why_it_matters: string;
  unresolved: unknown;
  evidence: unknown;
  proposal: unknown;
  next_action: string;
  thinking_evolution: string;
  accepted_at: string | null;
  created_at: string;
};

export type WorkspaceData = {
  project: Project;
  document: DocumentRow;
  role: ProjectRole;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  sources: ThinkingItem[];
  questions: ThinkingItem[];
  decisions: ThinkingItem[];
  comments: ThinkingItem[];
  branches: ThinkingItem[];
  checkpoints: ThinkingItem[];
  runs: LoopRun[];
  insights: LoopInsight[];
};
