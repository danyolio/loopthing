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
      "rewriting is optional and must not displace more useful criticism",
    );
    expect(CORE_SYSTEM_PROMPT).toContain(
      "Use conjecture and criticism as the primary way",
    );
    expect(CORE_SYSTEM_PROMPT).toContain(
      "specific positive judgment",
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

  it("ships daily Dreams as critique-first reviews with optional restorable rewrites", () => {
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
    expect(workflow).toContain(
      "make conjecture and criticism the primary work of the Dream",
    );
    expect(workflow).toContain("proposal may be null");
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

  it("embeds durable multilevel AI critique in the document and project rail", () => {
    const migration = readFileSync(
      "supabase/migrations/20260720051604_dream_critique_comments.sql",
      "utf8",
    );
    const workspace = readFileSync("components/workspace.tsx", "utf8");
    const panel = readFileSync("components/critique-panel.tsx", "utf8");
    const plugin = readFileSync("lib/critique-anchor-plugin.ts", "utf8");
    const workflow = readFileSync("workflows/run-loop.ts", "utf8");

    expect(migration).toContain(
      "add column critique_comments jsonb not null",
    );
    expect(migration).toContain("create table public.critique_reviews");
    expect(migration).toContain(
      "alter table public.critique_reviews enable row level security",
    );
    expect(migration).toContain("sync_critique_review_comment");
    expect(workspace).toContain("<CritiqueNotice");
    expect(workspace).toContain("<CritiquePanel");
    expect(workspace).toContain("createCritiqueAnchorPlugin");
    expect(plugin).toContain('class: "ai-critique-passage-anchor"');
    expect(plugin).toContain('class: "ai-critique-section-anchor"');
    expect(panel).toContain("Conjecture + criticism");
    expect(panel).toContain("Strength");
    expect(panel).toContain("Dismiss");
    expect(workflow).toContain("critique_comments: result.critiqueComments");
  });

  it("headlines the latest Loop's overall editorial direction in project context", () => {
    const workspace = readFileSync("components/workspace.tsx", "utf8");
    const feedback = readFileSync(
      "components/overall-feedback-card.tsx",
      "utf8",
    );

    expect(workspace).toContain("<OverallFeedbackCard");
    expect(feedback).toContain("Overall feedback");
    expect(feedback).toContain("Editorial read");
    expect(feedback).toContain("Direction now");
    expect(feedback).toContain("MessageResponse");
  });

  it("keeps scheduled failures inspectable without multiplying model retries", () => {
    const migration = readFileSync(
      "supabase/migrations/20260722010000_loop_runtime_observability.sql",
      "utf8",
    );
    const cron = readFileSync("app/api/cron/loops/route.ts", "utf8");
    const workflow = readFileSync("workflows/run-loop.ts", "utf8");
    const workspace = readFileSync("components/workspace.tsx", "utf8");

    expect(migration).toContain("record_scheduled_loop_workflow");
    expect(migration).toContain("record_scheduled_loop_runtime");
    expect(cron).toContain('"record_scheduled_loop_workflow"');
    expect(workflow).toContain('"record_scheduled_loop_runtime"');
    expect(workflow).toContain("throw new FatalError(message)");
    expect(workflow).toContain("throw new Error(message)");
    expect(workspace).toContain('runs[0]?.status === "failed"');
    expect(workspace).not.toContain(
      'runs.find((run) => run.status === "failed")',
    );
  });

  it("lets every project member anchor human comments to selected document text", () => {
    const migration = readFileSync(
      "supabase/migrations/20260719024832_loopthing_mvp.sql",
      "utf8",
    );
    const workspace = readFileSync("components/workspace.tsx", "utf8");
    const composer = readFileSync(
      "components/inline-comment-composer.tsx",
      "utf8",
    );
    const panel = readFileSync(
      "components/human-comments-panel.tsx",
      "utf8",
    );
    const plugin = readFileSync(
      "lib/human-comment-anchor-plugin.ts",
      "utf8",
    );

    expect(migration).toContain("anchor jsonb not null default '{}'::jsonb");
    expect(migration).toContain("create policy comments_insert_member");
    expect(workspace).toContain("<InlineCommentComposer");
    expect(workspace).toContain("<HumanCommentsPanel");
    expect(composer).toContain("Comment on selected text");
    expect(composer).toContain("Add comment");
    expect(plugin).toContain('class: "human-comment-anchor"');
    expect(plugin).toContain("dataset.humanCommentId");
    expect(panel).toContain("Resolve");
    expect(panel).toContain("Locate");
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

  it("distinguishes Dream changes from human additions in the document", () => {
    const workspace = readFileSync("components/workspace.tsx", "utf8");
    const deletedMaterial = readFileSync(
      "components/deleted-material-tray.tsx",
      "utf8",
    );
    const plugin = readFileSync("lib/dream-highlight-plugin.ts", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");

    expect(workspace).toContain("<DreamChangeNotice");
    expect(workspace).toContain("createDreamHighlightPlugin");
    expect(plugin).toContain('class: "dream-change-highlight"');
    expect(plugin).toContain('class: "human-change-highlight"');
    expect(styles).toContain(".tiptap .dream-change-highlight");
    expect(styles).toContain(".tiptap .human-change-highlight");
    expect(styles).toContain("#e9d5ff");
    expect(styles).toContain("#bbf7d0");
    expect(workspace).toContain("<DeletedMaterialTray");
    expect(deletedMaterial).toContain("<del");
    expect(deletedMaterial).toContain("Removed since the last Dream");
    expect(CORE_SYSTEM_PROMPT).toContain(
      "Do not restore removed passages merely because they existed",
    );
  });

  it("ships durable review, reasoning, and decision-memory primitives", () => {
    const migration = readFileSync(
      "supabase/migrations/20260720031422_reasoning_review_system.sql",
      "utf8",
    );
    const workflow = readFileSync("workflows/run-loop.ts", "utf8");
    const workspace = readFileSync("components/workspace.tsx", "utf8");
    const morningReview = readFileSync(
      "components/morning-review.tsx",
      "utf8",
    );
    const reasoning = readFileSync(
      "components/reasoning-workspace.tsx",
      "utf8",
    );

    for (const table of [
      "reasoning_nodes",
      "reasoning_edges",
      "dream_change_reviews",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
    expect(migration).toContain("add column alternatives text[]");
    expect(migration).toContain("add column reconsider_when text");
    expect(migration).toContain("get_scheduled_reasoning_context");
    expect(workflow).toContain("return a compact reasoning graph");
    expect(workspace).toContain("<MorningReview");
    expect(morningReview).toContain("Morning Review");
    expect(morningReview).toContain("Keep");
    expect(morningReview).toContain("Revert");
    expect(reasoning).toContain("Keep Dream map in the ledger");
    expect(reasoning).toContain("<ReasoningGraph");
  });

  it("makes the deterministic Thread the primary workflow graph", () => {
    const workspace = readFileSync("components/workspace.tsx", "utf8");
    const threadView = readFileSync("components/project-thread.tsx", "utf8");
    const threadModel = readFileSync("lib/project-thread.ts", "utf8");

    expect(workspace).toContain("<ProjectThread");
    expect(workspace).toContain('setWorkspaceView("thread")');
    expect(threadView).toContain("See how the work got here.");
    expect(threadView).toContain("Opening this view uses 0 model calls");
    expect(threadView).toContain("Tonight’s Dream");
    expect(threadView).toContain("<ReasoningGraph");
    expect(threadModel).toContain("countThreadChanges");
    expect(threadModel).toContain("referencedSourceIds");
    expect(threadModel).not.toContain("generateText");
  });

  it("explains the day, Dream, and morning rhythm on the landing page", () => {
    const landing = readFileSync("app/page.tsx", "utf8");

    expect(landing).toContain("Loopthing stays quiet by day");
    expect(landing).toContain("dreams on the new material overnight");
    expect(landing).toContain("Wake up to a");
    expect(landing).toContain("every earlier version remain intact");
    expect(landing).toContain("Dream commentary");
    expect(landing).toContain("Strength · on this passage");
    expect(landing).toContain("It rewrites only when a rewrite is useful");
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
