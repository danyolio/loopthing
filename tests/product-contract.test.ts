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
    expect(CORE_SYSTEM_PROMPT).toContain(
      "scheduled daily Dream is the explicit exception",
    );
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

  it("ships daily Dreams as complete, restorable document versions", () => {
    const migration = readFileSync(
      "supabase/migrations/20260719113226_add_overnight_dreams.sql",
      "utf8",
    );
    const workflow = readFileSync("workflows/run-loop.ts", "utf8");
    const schedule = readFileSync("vercel.json", "utf8");
    const provenanceMigration = readFileSync(
      "supabase/migrations/20260719114739_distinguish_dream_runs.sql",
      "utf8",
    );
    const identityMigration = readFileSync(
      "supabase/migrations/20260719121000_separate_dream_run_identity.sql",
      "utf8",
    );
    const changeSetMigration = readFileSync(
      "supabase/migrations/20260720000953_dream_change_sets_and_batch_invitations.sql",
      "utf8",
    );

    expect(migration).toContain("create or replace function public.apply_daily_dream");
    expect(migration).toContain("'dream'");
    expect(migration).toContain("reason <> 'dream'");
    expect(migration).toContain("new_activity");
    expect(workflow).toContain("Run the overnight Dream");
    expect(workflow).toContain("complete rewritten document");
    expect(schedule).toContain('"schedule": "0 17 * * *"');
    expect(provenanceMigration).toContain(
      "add column is_dream boolean not null default false",
    );
    expect(provenanceMigration).toContain("true");
    expect(identityMigration).toContain("'dream:' || a.id::text");
    expect(identityMigration).toContain("and lr.is_dream");
    expect(changeSetMigration).toContain("'pre_dream'");
    expect(changeSetMigration).toContain("base_version_id");
    expect(changeSetMigration).toContain("change_attribution");
  });

  it("creates several secure email-bound invitations in one request", () => {
    const route = readFileSync("app/api/invitations/route.ts", "utf8");
    const dialog = readFileSync("components/invite-dialog.tsx", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20260720000953_dream_change_sets_and_batch_invitations.sql",
      "utf8",
    );

    expect(route).toContain("emails: z.array(z.email()).min(1).max(20)");
    expect(route).toContain('rpc("create_or_refresh_invitations"');
    expect(dialog).toContain(
      "Separate addresses with commas, spaces, or new lines.",
    );
    expect(dialog).toContain("Copy all");
    expect(migration).toContain(
      "create or replace function public.create_or_refresh_invitations",
    );
  });

  it("explains the day, Dream, and morning rhythm on the landing page", () => {
    const landing = readFileSync("app/page.tsx", "utf8");

    expect(landing).toContain("Loopthing stays quiet by day");
    expect(landing).toContain("dreams on the new material overnight");
    expect(landing).toContain("Wake up to a");
    expect(landing).toContain("Every version is preserved");
    expect(landing).toContain("Overnight Dream report");
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
