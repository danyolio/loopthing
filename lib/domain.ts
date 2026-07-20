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
  next_daily_loop_at: string;
  next_weekly_loop_at: string;
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
  is_dream: boolean;
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
  change_attribution: unknown;
  change_details: unknown;
  reasoning_model: unknown;
  decision_alerts: unknown;
  critique_comments: unknown;
  accepted_at: string | null;
  created_at: string;
};

export type CritiqueReview = ThinkingItem & {
  project_id: string;
  loop_insight_id: string;
  comment_key: string;
  status: "open" | "resolved" | "dismissed" | "incorporated";
  response: string;
  reviewed_by: string;
  reviewed_at: string;
};

export type ReasoningNode = ThinkingItem & {
  project_id: string;
  stable_key: string | null;
  node_type: string;
  label: string;
  detail: string;
  status: string;
  confidence: number | null;
  origin: "human" | "dream";
};

export type ReasoningEdge = ThinkingItem & {
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation: string;
  origin: "human" | "dream";
};

export type DreamChangeReview = ThinkingItem & {
  project_id: string;
  dream_version_id: string;
  block_key: string;
  before_text: string;
  after_text: string;
  status: "kept" | "reverted" | "commented" | "branched";
  note: string;
  reviewed_by: string;
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
  reasoningNodes: ReasoningNode[];
  reasoningEdges: ReasoningEdge[];
  dreamChangeReviews: DreamChangeReview[];
  critiqueReviews: CritiqueReview[];
  versions: ThinkingItem[];
  runs: LoopRun[];
  insights: LoopInsight[];
};
