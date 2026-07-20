"use client";

import { useState } from "react";
import { AlarmClock, Check, RefreshCcw, Scale } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ThinkingItem } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

export type DecisionAlert = {
  decisionId: string | null;
  decisionStatement: string;
  severity: "watch" | "reconsider";
  reason: string;
  conflictingEvidence: string[];
  smallestExperiment: string;
};

function text(item: ThinkingItem, key: string) {
  return typeof item[key] === "string" ? String(item[key]) : "";
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function DecisionMemoryCard({
  item,
  editable,
  alerts,
}: {
  item: ThinkingItem;
  editable: boolean;
  alerts: DecisionAlert[];
}) {
  const [reviewState, setReviewState] = useState(text(item, "review_state") || "stable");
  const [saving, setSaving] = useState(false);
  const alternatives = strings(item.alternatives);
  const assumptions = strings(item.assumptions);
  const reconsiderWhen = text(item, "reconsider_when");
  const reviewAt = text(item, "review_at");

  async function updateReview(action: "reviewed" | "reopen") {
    setSaving(true);
    const now = new Date().toISOString();
    const changes =
      action === "reviewed"
        ? { review_state: "stable", last_reviewed_at: now }
        : { review_state: "reconsider", status: "proposed", last_reviewed_at: now };
    const { error } = await createClient()
      .from("decisions")
      .update(changes)
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReviewState(changes.review_state);
    toast.success(action === "reviewed" ? "Decision marked reviewed." : "Decision reopened.");
  }

  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          <Scale className="size-3.5" />
          Decision
        </span>
        <Badge variant={reviewState === "stable" ? "secondary" : "destructive"}>
          {reviewState}
        </Badge>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6">{text(item, "statement")}</p>
      {text(item, "rationale") && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {text(item, "rationale")}
        </p>
      )}
      {alternatives.length > 0 && (
        <section className="mt-4 border-t pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rejected alternatives</p>
          <ul className="mt-2 space-y-1">{alternatives.map((value) => <li key={value} className="text-xs leading-5">• {value}</li>)}</ul>
        </section>
      )}
      {assumptions.length > 0 && (
        <section className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Depends on</p>
          <ul className="mt-2 space-y-1">{assumptions.map((value) => <li key={value} className="text-xs leading-5">• {value}</li>)}</ul>
        </section>
      )}
      {(reconsiderWhen || reviewAt) && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <AlarmClock className="size-3" />
            Reconsideration rule
          </p>
          {reconsiderWhen && <p className="mt-1 text-xs leading-5">{reconsiderWhen}</p>}
          {reviewAt && <p className="mt-1 text-[10px] text-muted-foreground">Review {new Date(reviewAt).toLocaleDateString()}</p>}
        </div>
      )}
      {alerts.map((alert, index) => (
        <section key={`${alert.reason}-${index}`} className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50 p-3">
          <Badge variant="outline" className="border-amber-400 text-amber-900">{alert.severity}</Badge>
          <p className="mt-2 text-xs font-semibold leading-5">{alert.reason}</p>
          {alert.conflictingEvidence.length > 0 && (
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              New evidence: {alert.conflictingEvidence.join("; ")}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-5">
            <strong>Smallest test:</strong> {alert.smallestExperiment}
          </p>
          {editable && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={saving} onClick={() => updateReview("reviewed")}>
                <Check />
                Mark reviewed
              </Button>
              <Button size="sm" disabled={saving} onClick={() => updateReview("reopen")}>
                <RefreshCcw />
                Reopen
              </Button>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
