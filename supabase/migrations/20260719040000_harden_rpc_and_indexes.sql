-- Keep SECURITY DEFINER implementations out of the exposed API schema.
-- The public wrappers remain callable through PostgREST but run as invokers.

alter function public.accept_invitation(text) set schema private;
alter function public.claim_due_loop_runs(text) set schema private;
alter function public.get_scheduled_loop_context(text, uuid) set schema private;
alter function public.complete_scheduled_loop(text, uuid, jsonb) set schema private;

create function public.accept_invitation(p_token text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_invitation(p_token);
$$;

create function public.claim_due_loop_runs(p_secret text)
returns setof public.loop_runs
language sql
security invoker
set search_path = ''
as $$
  select * from private.claim_due_loop_runs(p_secret);
$$;

create function public.get_scheduled_loop_context(p_secret text, p_loop_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_scheduled_loop_context(p_secret, p_loop_id);
$$;

create function public.complete_scheduled_loop(
  p_secret text,
  p_loop_id uuid,
  p_result jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_scheduled_loop(p_secret, p_loop_id, p_result);
$$;

revoke all on function private.accept_invitation(text) from public, anon, authenticated;
revoke all on function private.claim_due_loop_runs(text) from public, anon, authenticated;
revoke all on function private.get_scheduled_loop_context(text, uuid) from public, anon, authenticated;
revoke all on function private.complete_scheduled_loop(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function private.accept_invitation(text) to authenticated;
grant execute on function private.claim_due_loop_runs(text) to anon;
grant execute on function private.get_scheduled_loop_context(text, uuid) to anon;
grant execute on function private.complete_scheduled_loop(text, uuid, jsonb) to anon;

revoke all on function public.accept_invitation(text) from public, anon, authenticated;
revoke all on function public.claim_due_loop_runs(text) from public, anon, authenticated;
revoke all on function public.get_scheduled_loop_context(text, uuid) from public, anon, authenticated;
revoke all on function public.complete_scheduled_loop(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.claim_due_loop_runs(text) to anon;
grant execute on function public.get_scheduled_loop_context(text, uuid) to anon;
grant execute on function public.complete_scheduled_loop(text, uuid, jsonb) to anon;

-- Cover every foreign key used by cascade checks, joins, or audit lookup.
create index branches_base_checkpoint_id_idx on public.branches (base_checkpoint_id);
create index branches_created_by_idx on public.branches (created_by);
create index branches_document_id_idx on public.branches (document_id);
create index branches_reviewed_by_idx on public.branches (reviewed_by);
create index comments_author_id_idx on public.comments (author_id);
create index comments_project_id_idx on public.comments (project_id);
create index comments_resolved_by_idx on public.comments (resolved_by);
create index decisions_created_by_idx on public.decisions (created_by);
create index decisions_decided_by_idx on public.decisions (decided_by);
create index document_versions_checkpoint_id_idx on public.document_versions (checkpoint_id);
create index document_versions_created_by_idx on public.document_versions (created_by);
create index document_versions_project_id_idx on public.document_versions (project_id);
create index documents_created_by_idx on public.documents (created_by);
create index documents_current_checkpoint_id_idx on public.documents (current_checkpoint_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index loop_insights_accepted_by_idx on public.loop_insights (accepted_by);
create index loop_runs_triggered_by_idx on public.loop_runs (triggered_by);
create index project_events_actor_id_idx on public.project_events (actor_id);
create index project_members_invited_by_idx on public.project_members (invited_by);
create index projects_owner_id_idx on public.projects (owner_id);
create index questions_created_by_idx on public.questions (created_by);
create index questions_resolved_by_idx on public.questions (resolved_by);
create index sources_created_by_idx on public.sources (created_by);
create index yjs_checkpoints_created_by_idx on public.yjs_checkpoints (created_by);
create index yjs_checkpoints_project_id_idx on public.yjs_checkpoints (project_id);
