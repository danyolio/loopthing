"use client";

import { ArrowRight, Bot, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type GraphNode = {
  id: string;
  key: string;
  type: string;
  label: string;
  detail: string;
  status: string;
  confidence: number | null;
  origin: "human" | "dream";
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  origin: "human" | "dream";
};

const inputTypes = new Set(["goal", "constraint", "fact", "evidence", "preference"]);
const outcomeTypes = new Set(["decision", "proposal", "experiment"]);

function nodeLayer(type: string) {
  if (inputTypes.has(type)) return 0;
  if (outcomeTypes.has(type)) return 2;
  return 1;
}

export function ReasoningGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const columns = [0, 1, 2].map((layer) =>
    nodes.filter((node) => nodeLayer(node.type) === layer),
  );
  const positioned = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  const width = 1080;
  const columnWidth = 284;
  const cardHeight = 116;
  const columnGap = 88;
  const rowGap = 28;

  columns.forEach((column, columnIndex) => {
    column.forEach((node, rowIndex) => {
      positioned.set(node.id, {
        x: 28 + columnIndex * (columnWidth + columnGap),
        y: 68 + rowIndex * (cardHeight + rowGap),
        width: columnWidth,
        height: cardHeight,
      });
    });
  });

  const height = Math.max(
    360,
    ...columns.map((column) => 96 + column.length * (cardHeight + rowGap)),
  );

  if (!nodes.length) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
        <div>
          <p className="font-semibold">No thinking to map yet</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            Add evidence, questions, assumptions, hypotheses, or decisions.
            The next Dream will connect them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl border bg-[#f8f8f5]">
      <div className="relative" style={{ width, height }}>
        <div className="absolute inset-x-0 top-0 grid grid-cols-3 gap-[88px] px-7 py-4">
          {["Inputs", "Reasoning", "Outcomes"].map((label) => (
            <p
              key={label}
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {label}
            </p>
          ))}
        </div>

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
        >
          <defs>
            <marker
              id="reasoning-arrow"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <path d="M0,0 L7,3.5 L0,7 z" fill="#9a9a91" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const from = positioned.get(edge.from);
            const to = positioned.get(edge.to);
            if (!from || !to) return null;
            const startX = from.x + from.width;
            const startY = from.y + from.height / 2;
            const endX = to.x;
            const endY = to.y + to.height / 2;
            const middleX = startX + (endX - startX) / 2;
            const path = `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX - 8} ${endY}`;
            return (
              <g key={edge.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={edge.origin === "dream" ? "#8b5cf6" : "#4f8f69"}
                  strokeOpacity="0.58"
                  strokeWidth="1.5"
                  markerEnd="url(#reasoning-arrow)"
                />
                <text
                  x={middleX}
                  y={(startY + endY) / 2 - 6}
                  textAnchor="middle"
                  className="fill-neutral-500 text-[9px]"
                >
                  {edge.relation.replaceAll("_", " ")}
                </text>
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const position = positioned.get(node.id)!;
          const dream = node.origin === "dream";
          return (
            <article
              key={node.id}
              className={
                dream
                  ? "absolute overflow-hidden rounded-xl border border-violet-500/30 bg-violet-50 shadow-sm"
                  : "absolute overflow-hidden rounded-xl border border-emerald-600/25 bg-emerald-50 shadow-sm"
              }
              style={{
                left: position.x,
                top: position.y,
                width: position.width,
                minHeight: position.height,
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2">
                <Badge
                  variant="outline"
                  className={dream ? "border-violet-300 text-violet-800" : "border-emerald-300 text-emerald-800"}
                >
                  {node.type}
                </Badge>
                <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                  {dream ? <Bot className="size-3" /> : <UserRound className="size-3" />}
                  {dream ? "Dream" : "Human"}
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="line-clamp-2 text-xs font-semibold leading-5">
                  {node.label}
                </p>
                {node.detail && (
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                    {node.detail}
                  </p>
                )}
                {node.confidence !== null && (
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {node.confidence}% confidence
                  </p>
                )}
              </div>
            </article>
          );
        })}

        {columns.some((column) => column.length) && (
          <span className="absolute bottom-4 right-5 flex items-center gap-1 text-[10px] text-muted-foreground">
            Follow the reasoning
            <ArrowRight className="size-3" />
          </span>
        )}
      </div>
    </div>
  );
}
