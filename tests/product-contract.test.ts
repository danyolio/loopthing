import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CORE_SYSTEM_PROMPT } from "@/lib/core-prompt";
import { simpleMarkdownToHtml } from "@/lib/markdown";

describe("product invariants", () => {
  it("keeps human control and evidence rules in the runtime prompt", () => {
    expect(CORE_SYSTEM_PROMPT).toContain(
      "never overwrite it without authorisation",
    );
    expect(CORE_SYSTEM_PROMPT).toContain("Never invent evidence");
    expect(CORE_SYSTEM_PROMPT).toContain("single most useful next action");
  });

  it("converts the seeded document structure without accepting raw HTML", () => {
    const html = simpleMarkdownToHtml(
      "# Thesis\n\n<script>alert('x')</script>\n\n## Evidence",
    );
    expect(html).toContain("<h1>Thesis</h1>");
    expect(html).toContain("<h2>Evidence</h2>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps RLS enabled for every exposed project table", () => {
    const migration = readFileSync(
      "supabase/migrations/20260719024832_loopthing_mvp.sql",
      "utf8",
    );
    const tables = [
      "projects",
      "project_members",
      "documents",
      "yjs_checkpoints",
      "comments",
      "sources",
      "questions",
      "decisions",
      "branches",
      "loop_runs",
      "loop_insights",
    ];
    for (const table of tables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });
});
