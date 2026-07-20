"use client";

import { useMemo, useState } from "react";
import { Bot, GitFork, LoaderCircle, Network, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ReasoningGraph, type GraphEdge, type GraphNode } from "@/components/reasoning-graph";
import type { LoopInsight, ReasoningEdge, ReasoningNode } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

const nodeTypes = [
  "goal",
  "constraint",
  "fact",
  "evidence",
  "claim",
  "assumption",
  "hypothesis",
  "preference",
  "question",
  "counterargument",
  "risk",
  "decision",
  "proposal",
  "experiment",
] as const;

const relations = [
  "supports",
  "challenges",
  "depends_on",
  "contradicts",
  "led_to",
  "supersedes",
  "reopens",
  "tests",
] as const;

function dreamGraph(insight: LoopInsight | undefined) {
  const value = insight?.reasoning_model;
  if (!value || typeof value !== "object") return { nodes: [], edges: [] };
  const graph = value as Record<string, unknown>;
  const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const nodes: GraphNode[] = rawNodes.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const node = value as Record<string, unknown>;
    if (typeof node.key !== "string" || typeof node.label !== "string") return [];
    return [{
      id: `dream:${node.key}`,
      key: node.key,
      type: typeof node.type === "string" ? node.type : "claim",
      label: node.label,
      detail: typeof node.detail === "string" ? node.detail : "",
      status: typeof node.status === "string" ? node.status : "active",
      confidence: typeof node.confidence === "number" ? node.confidence : null,
      origin: "dream" as const,
    }];
  });
  const keys = new Map(nodes.map((node) => [node.key, node.id]));
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const edges: GraphEdge[] = rawEdges.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const edge = value as Record<string, unknown>;
    const from = typeof edge.fromKey === "string" ? keys.get(edge.fromKey) : null;
    const to = typeof edge.toKey === "string" ? keys.get(edge.toKey) : null;
    if (!from || !to) return [];
    return [{
      id: `dream-edge:${index}:${from}:${to}`,
      from,
      to,
      relation: typeof edge.relation === "string" ? edge.relation : "supports",
      origin: "dream" as const,
    }];
  });
  return { nodes, edges };
}

export function ReasoningWorkspace({
  projectId,
  userId,
  editable,
  initialNodes,
  initialEdges,
  insights,
}: {
  projectId: string;
  userId: string;
  editable: boolean;
  initialNodes: ReasoningNode[];
  initialEdges: ReasoningEdge[];
  insights: LoopInsight[];
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [nodeType, setNodeType] = useState<(typeof nodeTypes)[number]>("hypothesis");
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [fromNodeId, setFromNodeId] = useState("");
  const [toNodeId, setToNodeId] = useState("");
  const [relation, setRelation] = useState<(typeof relations)[number]>("supports");
  const [mapOpen, setMapOpen] = useState(false);
  const [preserving, setPreserving] = useState(false);
  const latestInsight = insights[0];
  const dream = useMemo(() => dreamGraph(latestInsight), [latestInsight]);
  const durableGraphNodes: GraphNode[] = nodes.map((node) => ({
    id: node.id,
    key: node.stable_key ?? node.id,
    type: node.node_type,
    label: node.label,
    detail: node.detail,
    status: node.status,
    confidence: node.confidence,
    origin: node.origin,
  }));
  const durableGraphEdges: GraphEdge[] = edges.map((edge) => ({
    id: edge.id,
    from: edge.from_node_id,
    to: edge.to_node_id,
    relation: edge.relation,
    origin: edge.origin,
  }));

  async function addNode(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { data, error } = await createClient()
      .from("reasoning_nodes")
      .insert({
        project_id: projectId,
        node_type: nodeType,
        label: label.trim(),
        detail: detail.trim(),
        status: "active",
        origin: "human",
        created_by: userId,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not add this thought.");
      return;
    }
    setNodes((current) => [...current, data as ReasoningNode]);
    setLabel("");
    setDetail("");
    toast.success("Added to the reasoning ledger.");
  }

  async function addEdge(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { data, error } = await createClient()
      .from("reasoning_edges")
      .insert({
        project_id: projectId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        relation,
        origin: "human",
        created_by: userId,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not connect these thoughts.");
      return;
    }
    setEdges((current) => [...current, data as ReasoningEdge]);
    setFromNodeId("");
    setToNodeId("");
    toast.success("Reasoning connection saved.");
  }

  async function preserveDreamMap() {
    if (!latestInsight || !dream.nodes.length) return;
    setPreserving(true);
    const supabase = createClient();
    const nodeRows = dream.nodes.map((node) => ({
      project_id: projectId,
      stable_key: `dream:${latestInsight.id}:${node.key}`,
      node_type: node.type,
      label: node.label,
      detail: node.detail,
      status: node.status,
      confidence: node.confidence,
      origin: "dream",
      created_from_insight_id: latestInsight.id,
      created_by: userId,
    }));
    const { data: savedNodes, error: nodeError } = await supabase
      .from("reasoning_nodes")
      .upsert(nodeRows, { onConflict: "project_id,stable_key" })
      .select("*");
    if (nodeError || !savedNodes) {
      setPreserving(false);
      toast.error(nodeError?.message ?? "Could not preserve the Dream map.");
      return;
    }
    const typedSavedNodes = savedNodes as ReasoningNode[];
    const idByKey = new Map(
      typedSavedNodes.map((node) => [
        node.stable_key?.split(`dream:${latestInsight.id}:`)[1] ?? "",
        node.id,
      ]),
    );
    const edgeRows = dream.edges.flatMap((edge) => {
      const fromKey = dream.nodes.find((node) => node.id === edge.from)?.key;
      const toKey = dream.nodes.find((node) => node.id === edge.to)?.key;
      const fromNodeId = fromKey ? idByKey.get(fromKey) : null;
      const toNodeId = toKey ? idByKey.get(toKey) : null;
      if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return [];
      return [{
        project_id: projectId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        relation: edge.relation,
        origin: "dream",
        created_by: userId,
      }];
    });
    const edgeResult = edgeRows.length
      ? await supabase
          .from("reasoning_edges")
          .upsert(edgeRows, {
            onConflict: "project_id,from_node_id,to_node_id,relation",
            ignoreDuplicates: true,
          })
          .select("*")
      : { data: [], error: null };
    setPreserving(false);
    if (edgeResult.error) {
      toast.error(edgeResult.error.message);
      return;
    }
    setNodes((current) => [
      ...current.filter(
        (node) =>
          !typedSavedNodes.some(
            (saved) => saved.stable_key === node.stable_key,
          ),
      ),
      ...typedSavedNodes,
    ]);
    setEdges((current) => [
      ...current,
      ...((edgeResult.data ?? []) as ReasoningEdge[]).filter(
        (edge) => !current.some((existing) => existing.id === edge.id),
      ),
    ]);
    toast.success("The Dream’s reasoning is now part of the durable ledger.");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Network className="size-4" />
              Reasoning ledger
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Keep facts separate from assumptions. Preserve how the work reached a decision.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setMapOpen(true)}>
            <GitFork />
            Map
          </Button>
        </div>
      </section>

      {editable && (
        <form onSubmit={addNode} className="space-y-2 rounded-xl border border-emerald-600/20 bg-emerald-50/55 p-3">
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <Select value={nodeType} onValueChange={(value) => setNodeType(value as typeof nodeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {nodeTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Loose thought or precise claim" required />
          </div>
          <Textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Context, caveat, or why this matters" rows={2} />
          <Button size="sm" disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Add to ledger
          </Button>
        </form>
      )}

      {editable && nodes.length > 1 && (
        <form onSubmit={addEdge} className="space-y-2 rounded-xl border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Connect two thoughts
          </p>
          <Select value={fromNodeId} onValueChange={setFromNodeId}>
            <SelectTrigger><SelectValue placeholder="From…" /></SelectTrigger>
            <SelectContent>{nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={relation} onValueChange={(value) => setRelation(value as typeof relation)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{relations.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={toNodeId} onValueChange={setToNodeId}>
            <SelectTrigger><SelectValue placeholder="To…" /></SelectTrigger>
            <SelectContent>{nodes.filter((node) => node.id !== fromNodeId).map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={saving || !fromNodeId || !toNodeId}>
            <GitFork />
            Connect
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {nodes.map((node) => (
          <article key={node.id} className="rounded-xl border border-emerald-600/20 bg-emerald-50/55 p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="border-emerald-300 text-emerald-800">{node.node_type}</Badge>
              <span className="flex items-center gap-1 text-[10px] text-emerald-800"><UserRound className="size-3" />Human</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-5">{node.label}</p>
            {node.detail && <p className="mt-1 text-xs leading-5 text-muted-foreground">{node.detail}</p>}
          </article>
        ))}
        {dream.nodes.map((node) => (
          <article key={node.id} className="rounded-xl border border-violet-500/25 bg-violet-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="border-violet-300 text-violet-800">{node.type}</Badge>
              <span className="flex items-center gap-1 text-[10px] text-violet-800"><Bot className="size-3" />Dream snapshot</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-5">{node.label}</p>
            {node.detail && <p className="mt-1 text-xs leading-5 text-muted-foreground">{node.detail}</p>}
          </article>
        ))}
        {editable && dream.nodes.length > 0 && (
          <Button
            className="w-full"
            variant="outline"
            disabled={preserving}
            onClick={preserveDreamMap}
          >
            {preserving ? <LoaderCircle className="animate-spin" /> : <Bot />}
            Keep Dream map in the ledger
          </Button>
        )}
        {!nodes.length && !dream.nodes.length && (
          <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            No ledger entries yet.
          </p>
        )}
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-h-[88vh] max-w-[min(96vw,1180px)] overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>How the thinking developed</DialogTitle>
            <DialogDescription>
              Green is contributed by people. Purple is the latest Dream’s reasoning snapshot.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto p-5">
            <ReasoningGraph
              nodes={[...durableGraphNodes, ...dream.nodes]}
              edges={[...durableGraphEdges, ...dream.edges]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
