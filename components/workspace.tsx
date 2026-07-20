"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Cloud,
  CloudOff,
  GitBranch,
  History,
  Lightbulb,
  Link2,
  LoaderCircle,
  MessageSquare,
  Moon,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DreamChangeNotice } from "@/components/dream-change-notice";
import { DecisionMemoryCard, type DecisionAlert } from "@/components/decision-memory-card";
import { EditorToolbar } from "@/components/editor-toolbar";
import { InviteDialog } from "@/components/invite-dialog";
import { MorningReview } from "@/components/morning-review";
import { ReasoningWorkspace } from "@/components/reasoning-workspace";
import { VersionHistory } from "@/components/version-history";
import {
  WorkspaceItemForm,
  type ItemKind,
} from "@/components/workspace-item-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  AIProvider,
  LoopInsight,
  LoopRun,
  Project,
  ThinkingItem,
  WorkspaceData,
} from "@/lib/domain";
import {
  createDreamHighlightPlugin,
  dreamHighlightPluginKey,
} from "@/lib/dream-highlight-plugin";
import {
  dreamBlockChanges,
  textBlocks,
  type DreamBlockChange,
  latestDreamChangeSet,
} from "@/lib/dream-highlights";
import { replaceCanonicalDocument } from "@/lib/canonical-document";
import { createClient } from "@/lib/supabase/client";
import {
  collectionForItemKind,
  itemKindForCollection,
  type ItemCollection,
} from "@/lib/workspace-items";

type RailTab =
  | "loops"
  | "sources"
  | "questions"
  | "decisions"
  | "comments"
  | "branches"
  | "reasoning"
  | "history";

const railTabs: { id: RailTab; label: string; icon: typeof Sparkles }[] = [
  { id: "loops", label: "Dream", icon: Moon },
  { id: "sources", label: "Sources", icon: Link2 },
  { id: "questions", label: "Questions", icon: Lightbulb },
  { id: "decisions", label: "Decisions", icon: CircleDot },
  { id: "comments", label: "Notes & feedback", icon: MessageSquare },
  { id: "branches", label: "Branches", icon: GitBranch },
  { id: "reasoning", label: "Thinking", icon: Network },
  { id: "history", label: "Versions", icon: History },
];

const presenceColours = ["#b8f43d", "#ff9f6e", "#76b7ff", "#e596ff"];

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function getText(item: ThinkingItem | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asProposal(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const proposal = value as Record<string, unknown>;
  if (typeof proposal.content !== "string" || !proposal.content) return null;
  return {
    title: typeof proposal.title === "string" ? proposal.title : "Proposed change",
    rationale: typeof proposal.rationale === "string" ? proposal.rationale : "",
    content: proposal.content,
    isSignificantBranch: proposal.isSignificantBranch === true,
  };
}

function normalizeVersion(version: Record<string, unknown>): ThinkingItem {
  const relation = version.yjs_checkpoints;
  const checkpoint = Array.isArray(relation) ? relation[0] : relation;
  const checkpointRecord =
    checkpoint && typeof checkpoint === "object"
      ? (checkpoint as Record<string, unknown>)
      : null;
  const id = typeof version.id === "string" ? version.id : crypto.randomUUID();
  const createdAt =
    typeof version.created_at === "string"
      ? version.created_at
      : new Date().toISOString();
  return {
    ...version,
    id,
    created_at: createdAt,
    plain_text:
      typeof checkpointRecord?.plain_text === "string"
        ? checkpointRecord.plain_text
        : "",
    reason:
      typeof checkpointRecord?.reason === "string"
        ? checkpointRecord.reason
        : typeof version.source === "string"
          ? version.source
          : "",
    sequence: checkpointRecord?.sequence ?? null,
  };
}

export function Workspace({ initialData }: { initialData: WorkspaceData }) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [syncState, setSyncState] = useState<"offline" | "connecting" | "synced">(
    "connecting",
  );
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [mobileRail, setMobileRail] = useState(false);
  const [tab, setTab] = useState<RailTab>("loops");
  const [providerChoice, setProviderChoice] = useState<AIProvider>(
    initialData.project.ai_provider || "google",
  );
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    new Date(initialData.document.updated_at),
  );
  const [currentCheckpointId, setCurrentCheckpointId] = useState(
    initialData.document.current_checkpoint_id,
  );
  const [hiddenDreamVersionId, setHiddenDreamVersionId] = useState<
    string | null
  >(null);
  const [morningReviewOpen, setMorningReviewOpen] = useState(false);
  const [dreamChangeReviews, setDreamChangeReviews] = useState(
    initialData.dreamChangeReviews,
  );
  const [runs, setRuns] = useState(initialData.runs);
  const [insights, setInsights] = useState(initialData.insights);
  const [items, setItems] = useState({
    sources: initialData.sources,
    questions: initialData.questions,
    decisions: initialData.decisions,
    comments: initialData.comments,
    branches: initialData.branches,
    history: initialData.versions,
  });
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeded = useRef(false);
  const applyingDream = useRef<string | null>(null);
  const [dreamApplication, setDreamApplication] = useState<
    "idle" | "applying" | "applied" | "failed"
  >("idle");
  const editable = initialData.role === "owner" || initialData.role === "editor";
  const latestDream = useMemo(
    () => latestDreamChangeSet(items.history),
    [items.history],
  );
  const latestDreamBefore = getText(latestDream?.before, "plain_text");
  const latestDreamAfter = getText(latestDream?.after, "plain_text");
  const dreamChangedSections = useMemo(
    () =>
      latestDream
        ? dreamBlockChanges(
            latestDreamBefore,
            latestDreamAfter,
          ).length
        : 0,
    [latestDream, latestDreamAfter, latestDreamBefore],
  );
  const highlightsVisible =
    Boolean(latestDream) &&
    hiddenDreamVersionId !== latestDream?.after.id;

  useEffect(() => {
    const persistence = new IndexeddbPersistence(
      `loopthing:${initialData.document.id}`,
      ydoc,
    );
    persistence.whenSynced.then(() => setLocalReady(true));
    return () => {
      void persistence.destroy();
    };
  }, [initialData.document.id, ydoc]);

  useEffect(() => {
    const supabase = createClient();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const realtime = new HocuspocusProvider({
      url: `${protocol}//${window.location.host}/api/ws`,
      name: `${initialData.project.id}:${initialData.document.id}`,
      document: ydoc,
      token: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? "";
      },
      sessionAwareness: true,
      flushDelay: 250,
      onStatus: ({ status }) => {
        setSyncState(status === "connected" ? "connecting" : "offline");
      },
      onSynced: () => {
        setRemoteReady(true);
        setSyncState("synced");
      },
      onAuthenticationFailed: () => {
        setSyncState("offline");
        toast.error("Realtime access could not be verified.");
      },
    });
    const exposeProvider = window.setTimeout(() => setProvider(realtime), 0);
    const fallback = window.setTimeout(() => setRemoteReady(true), 2200);
    return () => {
      window.clearTimeout(exposeProvider);
      window.clearTimeout(fallback);
      void realtime.destroy();
    };
  }, [initialData.document.id, initialData.project.id, ydoc]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
        Placeholder.configure({
          placeholder:
            "Drop an unfinished thought, loose conjecture, question, or early idea…",
        }),
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user: {
                  name: initialData.user.displayName,
                  color:
                    presenceColours[
                      initialData.user.id.charCodeAt(0) % presenceColours.length
                    ],
                },
              }),
            ]
          : []),
      ],
      onUpdate: ({ editor: activeEditor }) => {
        const plainText = activeEditor.getText({ blockSeparator: "\n\n" });
        const text = ydoc.getText("plainText");
        ydoc.transact(() => {
          text.delete(0, text.length);
          text.insert(0, plainText);
        }, "plain-text");
      },
    },
    [provider],
  );

  useEffect(() => {
    if (
      !editor ||
      !highlightsVisible ||
      !latestDreamBefore ||
      !latestDreamAfter
    ) {
      return;
    }

    editor.registerPlugin(
      createDreamHighlightPlugin({
        before: latestDreamBefore,
        after: latestDreamAfter,
      }),
    );

    return () => {
      if (!editor.isDestroyed) {
        editor.unregisterPlugin(dreamHighlightPluginKey);
      }
    };
  }, [
    editor,
    highlightsVisible,
    latestDreamAfter,
    latestDreamBefore,
  ]);

  useEffect(() => {
    if (!editor || !localReady || !remoteReady || seeded.current) return;
    if (ydoc.getXmlFragment("default").length === 0) {
      replaceCanonicalDocument(editor, initialData.document.content_text);
    }
    seeded.current = true;
    setWorkspaceReady(true);
  }, [
    editor,
    initialData.document.content_text,
    localReady,
    remoteReady,
    ydoc,
  ]);

  const pendingDailyDream = insights.find((insight) => {
    if (insight.accepted_at || !asProposal(insight.proposal)) return false;
    const run = runs.find((item) => item.id === insight.loop_run_id);
    return run?.is_dream === true && run.status === "complete";
  });

  useEffect(() => {
    if (
      !editor ||
      !editable ||
      !workspaceReady ||
      !pendingDailyDream ||
      applyingDream.current
    ) {
      return;
    }

    const proposal = asProposal(pendingDailyDream.proposal);
    if (!proposal) return;

    applyingDream.current = pendingDailyDream.id;
    const previousDocument = editor.getJSON();

    const applyDream = async () => {
      await Promise.resolve();
      setDreamApplication("applying");
      replaceCanonicalDocument(editor, proposal.content);
      const update = Y.encodeStateAsUpdate(ydoc);
      const plainText = editor.getText({ blockSeparator: "\n\n" });
      const appliedAt = new Date().toISOString();
      const supabase = createClient();
      const { data, error } = await supabase.rpc("apply_daily_dream", {
        p_insight_id: pendingDailyDream.id,
        p_state_base64: bytesToBase64(update),
        p_plain_text: plainText,
      });

      if (error) {
        editor.commands.setContent(previousDocument);
        applyingDream.current = null;
        setDreamApplication("failed");
        toast.error(`The Dream is ready, but could not be applied: ${error.message}`);
        return;
      }

      setLastSavedAt(new Date());
      setInsights((current) =>
        current.map((item) =>
          item.id === pendingDailyDream.id
            ? { ...item, accepted_at: appliedAt }
            : item,
        ),
      );
      const { data: versionRows } = await supabase
        .from("document_versions")
        .select(
          "id,label,source,rationale,created_at,created_by,checkpoint_id,loop_run_id,insight_id,base_version_id,yjs_checkpoints(plain_text,reason,sequence)",
        )
        .eq("loop_run_id", pendingDailyDream.loop_run_id)
        .order("created_at", { ascending: false });
      const createdVersions: ThinkingItem[] = (
        (versionRows ?? []) as unknown as Record<string, unknown>[]
      ).map(normalizeVersion);
      const currentDreamVersion = createdVersions.find(
        (version) => version.id === String(data),
      );
      if (currentDreamVersion) {
        setCurrentCheckpointId(getText(currentDreamVersion, "checkpoint_id"));
      }
      setItems((current) => ({
        ...current,
        history: createdVersions.length
          ? [
              ...createdVersions,
              ...current.history.filter(
                (version) =>
                  !createdVersions.some((created) => created.id === version.id),
              ),
            ]
          : current.history,
      }));
      applyingDream.current = null;
      setDreamApplication("applied");
      toast.success("Last night’s Dream is now the current document.");
    };

    void applyDream();
  }, [editable, editor, pendingDailyDream, workspaceReady, ydoc]);

  const saveCheckpoint = useCallback(
    async (reason: "autosave" | "manual" | "accepted_proposal" | "restored") => {
      if (!editable || !editor) return;
      setSaving(true);
      const supabase = createClient();
      const update = Y.encodeStateAsUpdate(ydoc);
      const plainText = editor.getText({ blockSeparator: "\n\n" });
      const { data, error } = await supabase.rpc("save_yjs_checkpoint", {
        p_project_id: initialData.project.id,
        p_document_id: initialData.document.id,
        p_state_base64: bytesToBase64(update),
        p_plain_text: plainText,
        p_reason: reason,
      });
      setSaving(false);
      if (error) {
        if (reason !== "autosave") toast.error(error.message);
        return;
      }
      setLastSavedAt(new Date());
      setCurrentCheckpointId(String(data));
      if (reason !== "autosave") {
        setItems((current) => ({
          ...current,
          history: [
            {
              id: String(data),
              checkpoint_id: String(data),
              label:
                reason === "manual"
                  ? "Manual checkpoint"
                  : reason === "restored"
                    ? "Restored version"
                    : "Accepted proposal",
              source:
                reason === "accepted_proposal"
                  ? "ai_proposal"
                  : reason === "restored"
                    ? "restore"
                    : "human",
              reason,
              plain_text: plainText,
              created_at: new Date().toISOString(),
            },
            ...current.history,
          ],
        }));
        toast.success(reason === "manual" ? "Checkpoint saved." : "Document updated.");
      }
    },
    [
      editable,
      editor,
      initialData.document.id,
      initialData.project.id,
      ydoc,
    ],
  );

  useEffect(() => {
    if (!editor || !editable) return;
    const schedule = () => {
      if (applyingDream.current) return;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => saveCheckpoint("autosave"), 3500);
    };
    editor.on("update", schedule);
    return () => {
      editor.off("update", schedule);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [editor, editable, saveCheckpoint]);

  async function startLoop() {
    const response = await fetch("/api/loops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: initialData.project.id,
        loopType: "light",
        provider: providerChoice,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error || "The Loop could not start.");
      return;
    }
    setRuns((current) => [payload.run, ...current.filter((run) => run.id !== payload.run.id)]);
    setTab("loops");
    setRailOpen(true);
    pollRun(payload.run.id);
  }

  function pollRun(runId: string) {
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      const response = await fetch(`/api/loops/${runId}`);
      if (!response.ok) {
        if (attempts > 4) window.clearInterval(timer);
        return;
      }
      const payload: { run: LoopRun; insight: LoopInsight | null } =
        await response.json();
      setRuns((current) =>
        current.map((run) => (run.id === runId ? payload.run : run)),
      );
      if (payload.insight) {
        setInsights((current) => [
          payload.insight!,
          ...current.filter((insight) => insight.id !== payload.insight!.id),
        ]);
      }
      if (payload.run.status === "complete" || payload.run.status === "failed") {
        window.clearInterval(timer);
      }
    }, 1500);
  }

  async function acceptProposal(insight: LoopInsight) {
    if (!editor || !editable) return;
    const proposal = asProposal(insight.proposal);
    if (!proposal) return;

    if (proposal.isSignificantBranch) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("branches")
        .insert({
          project_id: initialData.project.id,
          document_id: initialData.document.id,
          base_checkpoint_id: initialData.document.current_checkpoint_id,
          title: proposal.title,
          rationale: proposal.rationale,
          proposed_content_text: proposal.content,
          created_by: initialData.user.id,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Could not create the proposal branch.");
        return;
      }
      setItems((current) => ({ ...current, branches: [data, ...current.branches] }));
      setTab("branches");
      toast.success("Proposal preserved as a branch for review.");
      return;
    }

    replaceCanonicalDocument(editor, proposal.content);
    await saveCheckpoint("accepted_proposal");
    await createClient()
      .from("loop_insights")
      .update({
        accepted_by: initialData.user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", insight.id);
    setInsights((current) =>
      current.map((item) =>
        item.id === insight.id
          ? { ...item, accepted_at: new Date().toISOString() }
          : item,
      ),
    );
  }

  async function acceptBranch(branch: ThinkingItem) {
    if (!editor || !editable) return;
    const content = getText(branch, "proposed_content_text");
    replaceCanonicalDocument(editor, content);
    await saveCheckpoint("accepted_proposal");
    const { error } = await createClient()
      .from("branches")
      .update({
        status: "accepted",
        reviewed_by: initialData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", branch.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((current) => ({
      ...current,
      branches: current.branches.map((item) =>
        item.id === branch.id ? { ...item, status: "accepted" } : item,
      ),
    }));
  }

  async function restoreCheckpoint(checkpoint: ThinkingItem) {
    if (!editor || !editable) return;
    const content = getText(checkpoint, "plain_text");
    replaceCanonicalDocument(editor, content);
    await saveCheckpoint("restored");
  }

  function onCreated(kind: ItemKind, item: Record<string, unknown>) {
    const collection = collectionForItemKind(kind);
    setItems((current) => ({
      ...current,
      [collection]: [item as ThinkingItem, ...current[collection]],
    }));
  }

  function openVersions() {
    setTab("history");
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setRailOpen(true);
    } else {
      setMobileRail(true);
    }
  }

  async function revertDreamChange(change: DreamBlockChange) {
    if (!editor || !editable) return;
    const currentBlocks = textBlocks(
      editor.getText({ blockSeparator: "\n\n" }),
    );
    const matchIndex = change.afterText
      ? currentBlocks.findIndex((block) => block === change.afterText)
      : -1;

    if (change.kind === "removed") {
      currentBlocks.splice(
        Math.min(change.beforeIndex ?? currentBlocks.length, currentBlocks.length),
        0,
        change.beforeText,
      );
    } else if (matchIndex === -1) {
      throw new Error(
        "This passage has changed again since the Dream. Restore the full Before version from Versions instead.",
      );
    } else if (change.kind === "added") {
      currentBlocks.splice(matchIndex, 1);
    } else {
      currentBlocks[matchIndex] = change.beforeText;
    }

    replaceCanonicalDocument(editor, currentBlocks.join("\n\n"));
    await saveCheckpoint("restored");
  }

  async function addMorningReviewComment(
    change: DreamBlockChange,
    note: string,
  ) {
    const { data, error } = await createClient()
      .from("comments")
      .insert({
        project_id: initialData.project.id,
        document_id: initialData.document.id,
        body: `${note}\n\nDream passage: “${change.afterText || change.beforeText}”`,
        anchor: {
          kind: "dream_change",
          dream_version_id: latestDream?.after.id,
          block_key: change.blockKey,
        },
        author_id: initialData.user.id,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Could not save feedback.");
    setItems((current) => ({ ...current, comments: [data, ...current.comments] }));
  }

  async function branchDreamChange(change: DreamBlockChange) {
    if (!latestDream) return;
    const excerpt = (change.afterText || change.beforeText).slice(0, 72);
    const { data, error } = await createClient()
      .from("branches")
      .insert({
        project_id: initialData.project.id,
        document_id: initialData.document.id,
        base_checkpoint_id: getText(latestDream.before, "checkpoint_id") || null,
        title: `Dream alternative: ${excerpt}${excerpt.length === 72 ? "…" : ""}`,
        rationale: "Preserved during Morning Review for separate development.",
        proposed_content_text: latestDreamAfter,
        created_by: initialData.user.id,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Could not create branch.");
    setItems((current) => ({ ...current, branches: [data, ...current.branches] }));
  }

  function onDreamReviewSaved(review: WorkspaceData["dreamChangeReviews"][number]) {
    setDreamChangeReviews((current) => [
      review,
      ...current.filter(
        (item) =>
          item.dream_version_id !== review.dream_version_id ||
          item.block_key !== review.block_key,
      ),
    ]);
  }

  const rail = (
    <Rail
      activeTab={tab}
      setActiveTab={setTab}
      items={items}
      runs={runs}
      insights={insights}
      editable={editable}
      editorText={editor?.getText({ blockSeparator: "\n\n" }) ?? ""}
      initialData={initialData}
      onCreated={onCreated}
      onAcceptProposal={acceptProposal}
      onAcceptBranch={acceptBranch}
      onRestore={restoreCheckpoint}
      dreamApplication={dreamApplication}
      currentCheckpointId={currentCheckpointId}
    />
  );

  return (
    <main className="flex h-[calc(100dvh-4rem)] min-h-0 bg-[var(--paper)]">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b bg-background/75 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button asChild variant="ghost" size="icon-sm">
              <Link href="/app" aria-label="Back to projects">
                <ArrowLeft />
              </Link>
            </Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{initialData.project.title}</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                {initialData.role} ·{" "}
                {syncState === "synced" ? "everyone is in sync" : syncState}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {initialData.role === "owner" && (
              <InviteDialog projectId={initialData.project.id} />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => saveCheckpoint("manual")}
                  disabled={!editable || saving}
                >
                  {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save checkpoint</TooltipContent>
            </Tooltip>
            <div className="hidden items-center gap-1.5 rounded-lg border bg-background p-1 sm:flex">
              <Select
                value={providerChoice}
                onValueChange={(value) => setProviderChoice(value as AIProvider)}
              >
                <SelectTrigger size="sm" className="h-7 w-[112px] border-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI / Codex</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7" onClick={startLoop} disabled={!editable}>
                <Play />
                Run Loop
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileRail(true)}
              aria-label="Open project context"
            >
              <PanelRightOpen />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={() => setRailOpen((current) => !current)}
              aria-label="Toggle project context"
            >
              {railOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </div>
        </div>

        <div className="flex min-h-11 items-center justify-between gap-4 border-b bg-background px-3 sm:px-5">
          <EditorToolbar editor={editor} disabled={!editable} />
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            {syncState === "synced" ? (
              <Cloud className="size-3.5 text-[var(--signal-strong)]" />
            ) : (
              <CloudOff className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {saving
                ? "Saving…"
                : lastSavedAt
                  ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
                  : "Offline-ready"}
            </span>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 bg-background">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
            {!localReady || !remoteReady || !editor ? (
              <div className="space-y-5">
                <Skeleton className="h-14 w-4/5" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="mt-12 h-8 w-2/5" />
              </div>
            ) : (
              <>
                <DreamChangeNotice
                  changedSections={dreamChangedSections}
                  highlightsVisible={highlightsVisible}
                  onToggleHighlights={() =>
                    setHiddenDreamVersionId(
                      highlightsVisible ? latestDream?.after.id ?? null : null,
                    )
                  }
                  onOpenReview={() => setMorningReviewOpen(true)}
                  onOpenVersions={openVersions}
                />
                {latestDream && (
                  <MorningReview
                    open={morningReviewOpen}
                    onOpenChange={setMorningReviewOpen}
                    projectId={initialData.project.id}
                    userId={initialData.user.id}
                    dreamVersion={latestDream.after}
                    beforeText={latestDreamBefore}
                    afterText={latestDreamAfter}
                    insight={insights.find(
                      (insight) =>
                        insight.id === getText(latestDream.after, "insight_id") ||
                        insight.loop_run_id ===
                          getText(latestDream.after, "loop_run_id"),
                    )}
                    initialReviews={dreamChangeReviews}
                    editable={editable}
                    onRevert={revertDreamChange}
                    onComment={addMorningReviewComment}
                    onBranch={branchDreamChange}
                    onReviewSaved={onDreamReviewSaved}
                  />
                )}
                <EditorContent editor={editor} />
              </>
            )}
          </div>
        </ScrollArea>
      </section>

      {railOpen && (
        <aside className="hidden w-[390px] shrink-0 border-l bg-background lg:block">
          {rail}
        </aside>
      )}
      <Sheet open={mobileRail} onOpenChange={setMobileRail}>
        <SheetContent className="w-[92vw] max-w-[390px] p-0" side="right">
          <SheetTitle className="sr-only">Project context</SheetTitle>
          {rail}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function decisionAlertsFor(
  decision: ThinkingItem,
  insights: LoopInsight[],
): DecisionAlert[] {
  const statement = getText(decision, "statement").trim().toLowerCase();
  return insights.flatMap((insight) => {
    if (!Array.isArray(insight.decision_alerts)) return [];
    return insight.decision_alerts.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const alert = value as Record<string, unknown>;
      const decisionId =
        typeof alert.decisionId === "string" ? alert.decisionId : null;
      const decisionStatement =
        typeof alert.decisionStatement === "string"
          ? alert.decisionStatement
          : "";
      if (
        decisionId !== decision.id &&
        decisionStatement.trim().toLowerCase() !== statement
      ) {
        return [];
      }
      if (
        alert.severity !== "watch" &&
        alert.severity !== "reconsider"
      ) {
        return [];
      }
      return [{
        decisionId,
        decisionStatement,
        severity: alert.severity,
        reason: typeof alert.reason === "string" ? alert.reason : "",
        conflictingEvidence: asStrings(alert.conflictingEvidence),
        smallestExperiment:
          typeof alert.smallestExperiment === "string"
            ? alert.smallestExperiment
            : "",
      } satisfies DecisionAlert];
    });
  });
}

function Rail({
  activeTab,
  setActiveTab,
  items,
  runs,
  insights,
  editable,
  editorText,
  initialData,
  onCreated,
  onAcceptProposal,
  onAcceptBranch,
  onRestore,
  dreamApplication,
  currentCheckpointId,
}: {
  activeTab: RailTab;
  setActiveTab: (tab: RailTab) => void;
  items: Record<"sources" | "questions" | "decisions" | "comments" | "branches" | "history", ThinkingItem[]>;
  runs: LoopRun[];
  insights: LoopInsight[];
  editable: boolean;
  editorText: string;
  initialData: WorkspaceData;
  onCreated: (kind: ItemKind, item: Record<string, unknown>) => void;
  onAcceptProposal: (insight: LoopInsight) => void;
  onAcceptBranch: (branch: ThinkingItem) => void;
  onRestore: (checkpoint: ThinkingItem) => void;
  dreamApplication: "idle" | "applying" | "applied" | "failed";
  currentCheckpointId: string | null;
}) {
  const itemTab =
    activeTab !== "loops" &&
    activeTab !== "history" &&
    activeTab !== "reasoning"
      ? activeTab
      : null;
  const itemKind: ItemKind | null = itemTab
    ? itemKindForCollection(itemTab as ItemCollection)
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-3">
        <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Project context
        </p>
        <div className="flex flex-wrap gap-1">
          {railTabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => setActiveTab(id)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {activeTab === "loops" && (
            <LoopPanel
              runs={runs}
              insights={insights}
              editable={editable}
              onAcceptProposal={onAcceptProposal}
              project={initialData.project}
              dreamApplication={dreamApplication}
            />
          )}
          {activeTab === "reasoning" && (
            <ReasoningWorkspace
              projectId={initialData.project.id}
              userId={initialData.user.id}
              editable={editable}
              initialNodes={initialData.reasoningNodes}
              initialEdges={initialData.reasoningEdges}
              insights={insights}
            />
          )}
          {itemKind && (editable || itemKind === "comment") && (
            <WorkspaceItemForm
              key={itemKind}
              kind={itemKind}
              projectId={initialData.project.id}
              documentId={initialData.document.id}
              userId={initialData.user.id}
              currentContent={editorText}
              onCreated={onCreated}
            />
          )}
          {itemTab &&
            (items[itemTab].length ? (
              items[itemTab].map((item) =>
                itemTab === "decisions" ? (
                  <DecisionMemoryCard
                    key={item.id}
                    item={item}
                    editable={editable}
                    alerts={decisionAlertsFor(item, insights)}
                  />
                ) : (
                  <ThinkingCard
                    key={item.id}
                    item={item}
                    kind={itemTab}
                    editable={editable}
                    onAcceptBranch={onAcceptBranch}
                  />
                ),
              )
            ) : (
              <EmptyPanel tab={itemTab} />
            ))}
          {activeTab === "history" &&
            <VersionHistory
              versions={items.history}
              insights={insights}
              currentCheckpointId={currentCheckpointId}
              editable={editable}
              onRestore={onRestore}
            />}
        </div>
      </ScrollArea>
    </div>
  );
}

function LoopPanel({
  runs,
  insights,
  editable,
  onAcceptProposal,
  project,
  dreamApplication,
}: {
  runs: LoopRun[];
  insights: LoopInsight[];
  editable: boolean;
  onAcceptProposal: (insight: LoopInsight) => void;
  project: Project;
  dreamApplication: "idle" | "applying" | "applied" | "failed";
}) {
  const activeRun = runs.find(
    (run) => run.status !== "complete" && run.status !== "failed",
  );
  const runById = new Map(runs.map((run) => [run.id, run]));
  const dailyInsights = insights.filter(
    (insight) => runById.get(insight.loop_run_id)?.is_dream === true,
  );
  const manualInsights = insights.filter(
    (insight) => runById.get(insight.loop_run_id)?.is_dream !== true,
  );

  return (
    <>
      <DreamSchedule
        nextDreamAt={project.next_daily_loop_at}
        applicationState={dreamApplication}
      />
      {activeRun && (
        <div className="rounded-xl border border-[var(--signal-strong)]/25 bg-[var(--signal)]/10 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <LoaderCircle className="size-4 animate-spin" />
              {activeRun.is_dream
                ? "Dreaming on the day’s work"
                : activeRun.progress_stage}
            </span>
            <span className="font-mono text-xs">{activeRun.progress_percent}%</span>
          </div>
          <Progress value={activeRun.progress_percent} className="mt-3 h-1.5" />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {activeRun.is_dream
              ? "Loopthing is following threads, testing the reasoning, and composing the next version."
              : "The Loop is durable. You can leave this page and return without losing its progress."}
          </p>
        </div>
      )}
      {runs.find((run) => run.status === "failed") && !activeRun && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold">The latest Loop stopped safely.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {runs.find((run) => run.status === "failed")?.error_message ||
              "No canonical work was changed."}
          </p>
        </div>
      )}
      {dailyInsights.map((insight) => (
        <DreamReport key={insight.id} insight={insight} />
      ))}
      {manualInsights.map((insight) => (
        <LoopInsightCard
          key={insight.id}
          insight={insight}
          editable={editable}
          onAcceptProposal={onAcceptProposal}
        />
      ))}
      {!insights.length && !activeRun && (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Moon className="mx-auto size-6 text-[var(--signal-strong)]" />
          <p className="mt-3 text-sm font-semibold">
            Add something unfinished today
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Loopthing will stay out of the way, dream on it overnight, and
            return with a rewritten document, a critique, and new questions.
          </p>
        </div>
      )}
    </>
  );
}

function DreamSchedule({
  nextDreamAt,
  applicationState,
}: {
  nextDreamAt: string;
  applicationState: "idle" | "applying" | "applied" | "failed";
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const ready = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearTimeout(ready);
      window.clearInterval(timer);
    };
  }, []);

  const nextDream = new Date(nextDreamAt);
  const valid = Number.isFinite(nextDream.getTime());
  const absolute = valid
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(nextDream)
    : "overnight";
  const relative =
    now && valid
      ? nextDream.getTime() <= now.getTime()
        ? "due now"
        : formatDistanceToNow(nextDream, { addSuffix: true })
      : "calculating…";

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--ink)] text-[var(--paper)]">
      <div className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Moon className="size-4 text-[var(--signal)]" />
            Next overnight Dream
          </p>
          <p className="mt-2 text-xs leading-5 text-white/55">
            Runs daily when there is new work. No new activity, no needless
            rewrite.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-[var(--signal)]">{relative}</p>
          <p className="mt-1 text-[10px] text-white/40">{absolute}</p>
        </div>
      </div>
      {applicationState !== "idle" && (
        <div className="border-t border-white/10 px-4 py-2.5 text-xs text-white/60">
          {applicationState === "applying" && (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-3.5 animate-spin" />
              Waking the latest Dream into the document…
            </span>
          )}
          {applicationState === "applied" && (
            <span className="flex items-center gap-2 text-[var(--signal)]">
              <Check className="size-3.5" />
              Last night’s version is now current.
            </span>
          )}
          {applicationState === "failed" && (
            <span>The Dream is preserved, but needs another attempt to apply.</span>
          )}
        </div>
      )}
    </div>
  );
}

function DreamReport({ insight }: { insight: LoopInsight }) {
  const questions = asStrings(insight.unresolved);

  return (
    <article className="rounded-xl border border-[var(--signal-strong)]/20 bg-[var(--signal)]/[0.055] p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge className="bg-[var(--signal-strong)]">
          <Moon className="size-3" />
          Overnight Dream report
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
        </span>
      </div>

      <section className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          What became stronger
        </p>
        <h3 className="mt-2 font-semibold leading-6">{insight.summary}</h3>
        {insight.thinking_evolution && (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {insight.thinking_evolution}
          </p>
        )}
      </section>

      <section className="mt-5 border-t pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Honest critique
        </p>
        <p className="mt-2 text-sm leading-6">{insight.why_it_matters}</p>
      </section>

      {asStrings(insight.what_changed).length > 0 && (
        <section className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What changed overnight
          </p>
          <div className="mt-2 space-y-2">
            {asStrings(insight.what_changed).map((change) => (
              <p key={change} className="flex gap-2 text-xs leading-5">
                <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[var(--signal-strong)]" />
                {change}
              </p>
            ))}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Questions to keep the riff going
          </p>
          <ol className="mt-2 space-y-2">
            {questions.map((question, index) => (
              <li key={question} className="flex gap-2 text-xs leading-5">
                <span className="font-mono text-[var(--signal-strong)]">
                  {index + 1}.
                </span>
                {question}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-5 rounded-lg bg-[var(--ink)] p-3 text-[var(--paper)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">
          Thread to follow today
        </p>
        <p className="mt-1 text-sm leading-6 text-white/80">
          {insight.next_action}
        </p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--signal-strong)]">
        {insight.accepted_at ? (
          <>
            <Check className="size-3.5" />
            Rewritten document preserved as a new version
          </>
        ) : (
          <>
            <LoaderCircle className="size-3.5 animate-spin" />
            Ready to become the current version
          </>
        )}
      </p>
    </article>
  );
}

function LoopInsightCard({
  insight,
  editable,
  onAcceptProposal,
}: {
  insight: LoopInsight;
  editable: boolean;
  onAcceptProposal: (insight: LoopInsight) => void;
}) {
  const proposal = asProposal(insight.proposal);

  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant={insight.material_change ? "default" : "secondary"}
          className={insight.material_change ? "bg-[var(--signal-strong)]" : ""}
        >
          {insight.material_change ? "Material change" : "No material change"}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
        </span>
      </div>
      <h3 className="mt-4 font-semibold leading-6">{insight.summary}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {insight.why_it_matters}
      </p>
      {asStrings(insight.what_changed).length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What changed
          </p>
          {asStrings(insight.what_changed).map((change) => (
            <p key={change} className="flex gap-2 text-xs leading-5">
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[var(--signal-strong)]" />
              {change}
            </p>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-lg bg-muted/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Next useful action
        </p>
        <p className="mt-1 text-sm leading-6">{insight.next_action}</p>
      </div>
      {proposal && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center gap-2">
            {proposal.isSignificantBranch ? (
              <GitBranch className="size-4" />
            ) : (
              <BookOpen className="size-4" />
            )}
            <p className="text-sm font-semibold">{proposal.title}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {proposal.rationale}
          </p>
          {editable && !insight.accepted_at && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => onAcceptProposal(insight)}
            >
              <Check />
              {proposal.isSignificantBranch
                ? "Create review branch"
                : "Accept into document"}
            </Button>
          )}
          {insight.accepted_at && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--signal-strong)]">
              <Check className="size-3.5" />
              Accepted by a person
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ThinkingCard({
  item,
  kind,
  editable,
  onAcceptBranch,
}: {
  item: ThinkingItem;
  kind: Exclude<RailTab, "loops" | "reasoning" | "history">;
  editable: boolean;
  onAcceptBranch: (item: ThinkingItem) => void;
}) {
  const title = getText(item, "title", "statement", "body");
  const detail = getText(
    item,
    "rationale",
    "why_it_matters",
    "excerpt",
    "url",
    "proposed_content_text",
  );
  const status = getText(item, "status");

  return (
    <article
      className={
        kind === "comments"
          ? "rounded-xl border border-emerald-600/20 bg-emerald-50/55 p-4"
          : "rounded-xl border p-4"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            kind === "comments"
              ? "text-[11px] font-semibold uppercase tracking-[0.13em] text-emerald-800"
              : "text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground"
          }
        >
          {kind === "comments"
            ? "note"
            : itemKindForCollection(kind as ItemCollection)}
        </span>
        {status && <Badge variant="secondary">{status}</Badge>}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6">{title}</p>
      {detail && (
        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
          {detail}
        </p>
      )}
      {kind === "branches" && status === "open" && editable && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => onAcceptBranch(item)}>
          <Check />
          Accept branch
        </Button>
      )}
    </article>
  );
}

function EmptyPanel({ tab }: { tab: RailTab }) {
  const label =
    tab === "comments" ? "notes" : tab === "history" ? "versions" : tab;
  return (
    <div className="rounded-xl border border-dashed p-6 text-center">
      <p className="text-sm font-semibold">No {label} yet</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Add something unfinished. It will become part of the next Dream’s
        context.
      </p>
    </div>
  );
}
