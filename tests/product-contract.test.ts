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
      "profiles",
      "projects",
      "project_members",
      "invitations",
      "documents",
      "yjs_checkpoints",
      "document_versions",
      "comments",
      "sources",
      "questions",
      "decisions",
      "branches",
      "loop_runs",
      "loop_insights",
      "project_events",
      "project_templates",
    ];
    for (const table of tables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("wires upgraded WebSocket frames into Hocuspocus", () => {
    const route = readFileSync("app/api/ws/route.ts", "utf8");
    expect(route).toContain('socket.on("message"');
    expect(route).toContain("connection.handleMessage(bytes)");
    expect(route).toContain('socket.on("close"');
    expect(route).toContain("connection.handleClose");
  });

  it("ships the long-form writing template for essays and articles", () => {
    const migration = readFileSync(
      "supabase/migrations/20260719111017_add_long_form_writing_template.sql",
      "utf8",
    );
    expect(migration).toContain("'long-form-writing'");
    expect(migration).toContain("essay, article, or thesis");
  });

  it("does not offer an OAuth provider that is disabled in production", () => {
    const authForm = readFileSync("components/auth-form.tsx", "utf8");
    expect(authForm).not.toContain("signInWithOAuth");
    expect(authForm).not.toContain("Continue with Google");
  });

  it("configures baseline browser security headers", () => {
    const config = readFileSync("next.config.ts", "utf8");
    for (const header of [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(config).toContain(header);
    }
  });
});
