"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Bot,
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
  PanelRightClose,
  PanelRightOpen,
  Play,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor-toolbar";
import { InviteDialog } from "@/components/invite-dialog";
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
  ThinkingItem,
  WorkspaceData,
} from "@/lib/domain";
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
  | "history";

const railTabs: { id: RailTab; label: string; icon: typeof Sparkles }[] = [
  { id: "loops", label: "Loops", icon: Sparkles },
  { id: "sources", label: "Sources", icon: Link2 },
  { id: "questions", label: "Questions", icon: Lightbulb },
  { id: "decisions", label: "Decisions", icon: CircleDot },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "branches", label: "Branches", icon: GitBranch },
  { id: "history", label: "History", icon: History },
];

const presenceColours = ["#b8f43d", "#ff9f6e", "#76b7ff", "#e596ff"];

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function getText(item: ThinkingItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
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

export function Workspace({ initialData }: { initialData: WorkspaceData }) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [syncState, setSyncState] = useState<"offline" | "connecting" | "synced">(
    "connecting",
  );
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
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
  const [runs, setRuns] = useState(initialData.runs);
  const [insights, setInsights] = useState(initialData.insights);
  const [items, setItems] = useState({
    sources: initialData.sources,
    questions: initialData.questions,
    decisions: initialData.decisions,
    comments: initialData.comments,
    branches: initialData.branches,
    history: initialData.checkpoints,
  });
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeded = useRef(false);
  const editable = initialData.role === "owner" || initialData.role === "editor";

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
            "Start with the decision, question, or outcome this work needs to move forward…",
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
    if (!editor || !localReady || !remoteReady || seeded.current) return;
    if (ydoc.getXmlFragment("default").length === 0) {
      replaceCanonicalDocument(editor, initialData.document.content_text);
    }
    seeded.current = true;
  }, [
    editor,
    initialData.document.content_text,
    localReady,
    remoteReady,
    ydoc,
  ]);

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
      if (reason !== "autosave") {
        setItems((current) => ({
          ...current,
          history: [
            {
              id: String(data),
              sequence: "new",
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
              <EditorContent editor={editor} />
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
}) {
  const itemTab = activeTab !== "loops" && activeTab !== "history" ? activeTab : null;
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
              items[itemTab].map((item) => (
                <ThinkingCard
                  key={item.id}
                  item={item}
                  kind={itemTab}
                  editable={editable}
                  onAcceptBranch={onAcceptBranch}
                />
              ))
            ) : (
              <EmptyPanel tab={itemTab} />
            ))}
          {activeTab === "history" &&
            (items.history.length ? (
              items.history.map((checkpoint, index) => (
                <div key={checkpoint.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {getText(checkpoint, "reason").replaceAll("_", " ") || "checkpoint"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(getText(checkpoint, "created_at")), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {getText(checkpoint, "plain_text") || "Yjs state checkpoint"}
                  </p>
                  {items.history[index + 1] && (
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                      {getText(checkpoint, "plain_text").length -
                        getText(items.history[index + 1], "plain_text").length >=
                      0
                        ? "+"
                        : ""}
                      {getText(checkpoint, "plain_text").length -
                        getText(items.history[index + 1], "plain_text").length}{" "}
                      characters from previous checkpoint
                    </p>
                  )}
                  {editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 -ml-2"
                      onClick={() => onRestore(checkpoint)}
                    >
                      <RotateCcw />
                      Restore as a new version
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <EmptyPanel tab="history" />
            ))}
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
}: {
  runs: LoopRun[];
  insights: LoopInsight[];
  editable: boolean;
  onAcceptProposal: (insight: LoopInsight) => void;
}) {
  const activeRun = runs.find(
    (run) => run.status !== "complete" && run.status !== "failed",
  );

  return (
    <>
      {activeRun && (
        <div className="rounded-xl border border-[var(--signal-strong)]/25 bg-[var(--signal)]/10 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <LoaderCircle className="size-4 animate-spin" />
              {activeRun.progress_stage}
            </span>
            <span className="font-mono text-xs">{activeRun.progress_percent}%</span>
          </div>
          <Progress value={activeRun.progress_percent} className="mt-3 h-1.5" />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            The Loop is durable. You can leave this page and return without
            losing its progress.
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
      {insights.length ? (
        insights.map((insight) => {
          const proposal = asProposal(insight.proposal);
          return (
            <article key={insight.id} className="rounded-xl border p-4">
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
        })
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Bot className="mx-auto size-6 text-[var(--signal-strong)]" />
          <p className="mt-3 text-sm font-semibold">The first Loop starts here</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            It will connect changes, questions, decisions, and evidence without
            rewriting your document.
          </p>
        </div>
      )}
    </>
  );
}

function ThinkingCard({
  item,
  kind,
  editable,
  onAcceptBranch,
}: {
  item: ThinkingItem;
  kind: Exclude<RailTab, "loops" | "history">;
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
    <article className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {itemKindForCollection(kind as ItemCollection)}
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
  return (
    <div className="rounded-xl border border-dashed p-6 text-center">
      <p className="text-sm font-semibold">No {tab} yet</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        This context stays attached to the living document when it appears.
      </p>
    </div>
  );
}
