-- Turn the reasoning model in the core prompt into durable product data.
-- Human ledger entries remain editable project context. Each Loop also stores
-- an immutable reasoning snapshot and decision-watch report with its insight.

alter table public.decisions
  add column alternatives text[] not null default '{}',
  add column assumptions text[] not null default '{}',
  add column reconsider_when text not null default '',
  add column review_at timestamptz,
  add column review_state text not null default 'stable',
  add column last_reviewed_at timestamptz;

alter table public.decisions
  add constraint decisions_review_state_check
  check (review_state in ('stable', 'watch', 'reconsider'));

alter table public.loop_insights
  add column change_details jsonb not null default '[]'::jsonb,
  add column reasoning_model jsonb not null
    default '{"nodes":[],"edges":[]}'::jsonb,
  add column decision_alerts jsonb not null default '[]'::jsonb;

create table public.reasoning_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stable_key text,
  node_type text not null check (
    node_type in (
      'goal',
      'constraint',
      'fact',
      'evidence',
      'claim',
      'assumption',
      'hypothesis',
      'preference',
      'question',
      'counterargument',
      'risk',
      'decision',
      'proposal',
      'experiment'
    )
  ),
  label text not null check (char_length(label) between 1 and 1000),
  detail text not null default '',
  status text not null default 'active'
    check (status in ('active', 'resolved', 'superseded')),
  confidence smallint check (confidence between 0 and 100),
  origin text not null default 'human'
    check (origin in ('human', 'dream')),
  created_from_insight_id uuid
    references public.loop_insights(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stable_key),
  unique (project_id, id)
);

create table public.reasoning_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_node_id uuid not null,
  to_node_id uuid not null,
  relation text not null check (
    relation in (
      'supports',
      'challenges',
      'depends_on',
      'contradicts',
      'led_to',
      'supersedes',
      'reopens',
      'tests'
    )
  ),
  origin text not null default 'human'
    check (origin in ('human', 'dream')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reasoning_edges_distinct_nodes_check
    check (from_node_id <> to_node_id),
  constraint reasoning_edges_from_node_fkey
    foreign key (project_id, from_node_id)
    references public.reasoning_nodes(project_id, id)
    on delete cascade,
  constraint reasoning_edges_to_node_fkey
    foreign key (project_id, to_node_id)
    references public.reasoning_nodes(project_id, id)
    on delete cascade,
  unique (project_id, from_node_id, to_node_id, relation)
);

create table public.dream_change_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  dream_version_id uuid not null
    references public.document_versions(id) on delete cascade,
  block_key text not null,
  before_text text not null default '',
  after_text text not null default '',
  status text not null check (
    status in ('kept', 'reverted', 'commented', 'branched')
  ),
  note text not null default '',
  reviewed_by uuid not null references auth.users(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dream_version_id, block_key)
);

create index decisions_project_review_idx
  on public.decisions (project_id, review_state, review_at);
create index reasoning_nodes_project_status_created_idx
  on public.reasoning_nodes (project_id, status, created_at desc);
create index reasoning_nodes_project_type_idx
  on public.reasoning_nodes (project_id, node_type);
create index reasoning_nodes_created_by_idx
  on public.reasoning_nodes (created_by);
create index reasoning_nodes_insight_idx
  on public.reasoning_nodes (created_from_insight_id);
create index reasoning_edges_project_created_idx
  on public.reasoning_edges (project_id, created_at);
create index reasoning_edges_from_node_idx
  on public.reasoning_edges (from_node_id);
create index reasoning_edges_to_node_idx
  on public.reasoning_edges (to_node_id);
create index reasoning_edges_created_by_idx
  on public.reasoning_edges (created_by);
create index dream_change_reviews_project_version_idx
  on public.dream_change_reviews (project_id, dream_version_id);
create index dream_change_reviews_reviewed_by_idx
  on public.dream_change_reviews (reviewed_by);

create trigger reasoning_nodes_touch_updated_at
before update on public.reasoning_nodes
for each row execute function private.touch_updated_at();

create trigger dream_change_reviews_touch_updated_at
before update on public.dream_change_reviews
for each row execute function private.touch_updated_at();

alter table public.reasoning_nodes enable row level security;
alter table public.reasoning_edges enable row level security;
alter table public.dream_change_reviews enable row level security;

create policy reasoning_nodes_select_member on public.reasoning_nodes
for select to authenticated
using (private.is_project_member(project_id));

create policy reasoning_nodes_insert_editor on public.reasoning_nodes
for insert to authenticated
with check (
  private.can_edit_project(project_id)
  and created_by = (select auth.uid())
);

create policy reasoning_nodes_update_editor on public.reasoning_nodes
for update to authenticated
using (private.can_edit_project(project_id))
with check (
  private.can_edit_project(project_id)
  and (created_by = (select auth.uid()) or created_by is null)
);

create policy reasoning_nodes_delete_editor on public.reasoning_nodes
for delete to authenticated
using (private.can_edit_project(project_id));

create policy reasoning_edges_select_member on public.reasoning_edges
for select to authenticated
using (private.is_project_member(project_id));

create policy reasoning_edges_insert_editor on public.reasoning_edges
for insert to authenticated
with check (
  private.can_edit_project(project_id)
  and created_by = (select auth.uid())
);

create policy reasoning_edges_delete_editor on public.reasoning_edges
for delete to authenticated
using (private.can_edit_project(project_id));

create policy dream_change_reviews_select_member
on public.dream_change_reviews
for select to authenticated
using (private.is_project_member(project_id));

create policy dream_change_reviews_insert_editor
on public.dream_change_reviews
for insert to authenticated
with check (
  private.can_edit_project(project_id)
  and reviewed_by = (select auth.uid())
);

create policy dream_change_reviews_update_editor
on public.dream_change_reviews
for update to authenticated
using (private.can_edit_project(project_id))
with check (
  private.can_edit_project(project_id)
  and reviewed_by = (select auth.uid())
);

create policy dream_change_reviews_delete_editor
on public.dream_change_reviews
for delete to authenticated
using (private.can_edit_project(project_id));

grant select, insert, update, delete
  on public.reasoning_nodes to authenticated;
grant select, insert, delete
  on public.reasoning_edges to authenticated;
grant select, insert, update, delete
  on public.dream_change_reviews to authenticated;

-- Existing Sources, Questions, and Decisions become the first ledger entries.
insert into public.reasoning_nodes (
  project_id,
  stable_key,
  node_type,
  label,
  detail,
  status,
  origin,
  created_by,
  created_at,
  updated_at
)
select
  source.project_id,
  'source:' || source.id::text,
  'evidence',
  source.title,
  coalesce(nullif(source.excerpt, ''), source.url, ''),
  'active',
  'human',
  source.created_by,
  source.created_at,
  source.updated_at
from public.sources source
on conflict (project_id, stable_key) do nothing;

insert into public.reasoning_nodes (
  project_id,
  stable_key,
  node_type,
  label,
  detail,
  status,
  origin,
  created_by,
  created_at,
  updated_at
)
select
  question.project_id,
  'question:' || question.id::text,
  'question',
  question.statement,
  question.why_it_matters,
  case when question.status = 'resolved' then 'resolved' else 'active' end,
  'human',
  question.created_by,
  question.created_at,
  question.updated_at
from public.questions question
on conflict (project_id, stable_key) do nothing;

insert into public.reasoning_nodes (
  project_id,
  stable_key,
  node_type,
  label,
  detail,
  status,
  origin,
  created_by,
  created_at,
  updated_at
)
select
  decision.project_id,
  'decision:' || decision.id::text,
  'decision',
  decision.statement,
  decision.rationale,
  case when decision.status = 'reversed' then 'superseded' else 'active' end,
  'human',
  decision.created_by,
  decision.created_at,
  decision.updated_at
from public.decisions decision
on conflict (project_id, stable_key) do nothing;

-- Keep the ledger in sync when ordinary context objects change.
create or replace function private.sync_context_reasoning_node()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record jsonb;
  v_project_id uuid;
  v_created_by uuid;
  v_stable_key text;
  v_node_type text;
  v_label text;
  v_detail text;
  v_status text;
begin
  v_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_project_id := (v_record ->> 'project_id')::uuid;
  v_created_by := (v_record ->> 'created_by')::uuid;
  v_stable_key := rtrim(tg_table_name, 's') || ':' || (v_record ->> 'id');

  if tg_op = 'DELETE' then
    delete from public.reasoning_nodes node
    where node.project_id = v_project_id
      and node.stable_key = v_stable_key;
    return old;
  end if;

  if tg_table_name = 'sources' then
    v_node_type := 'evidence';
    v_label := v_record ->> 'title';
    v_detail := coalesce(
      nullif(v_record ->> 'excerpt', ''),
      v_record ->> 'url',
      ''
    );
    v_status := 'active';
  elsif tg_table_name = 'questions' then
    v_node_type := 'question';
    v_label := v_record ->> 'statement';
    v_detail := coalesce(v_record ->> 'why_it_matters', '');
    v_status := case
      when v_record ->> 'status' = 'resolved' then 'resolved'
      else 'active'
    end;
  else
    v_node_type := 'decision';
    v_label := v_record ->> 'statement';
    v_detail := coalesce(v_record ->> 'rationale', '');
    v_status := case
      when v_record ->> 'status' = 'reversed' then 'superseded'
      else 'active'
    end;
  end if;

  insert into public.reasoning_nodes (
    project_id,
    stable_key,
    node_type,
    label,
    detail,
    status,
    origin,
    created_by
  )
  values (
    v_project_id,
    v_stable_key,
    v_node_type,
    v_label,
    v_detail,
    v_status,
    'human',
    v_created_by
  )
  on conflict (project_id, stable_key) do update set
    node_type = excluded.node_type,
    label = excluded.label,
    detail = excluded.detail,
    status = excluded.status,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.sync_context_reasoning_node() from public;

create trigger sources_sync_reasoning_node
after insert or update or delete on public.sources
for each row execute function private.sync_context_reasoning_node();

create trigger questions_sync_reasoning_node
after insert or update or delete on public.questions
for each row execute function private.sync_context_reasoning_node();

create trigger decisions_sync_reasoning_node
after insert or update or delete on public.decisions
for each row execute function private.sync_context_reasoning_node();

-- Supply the human ledger to both manual and scheduled Loops.
create or replace function private.get_scheduled_reasoning_context(
  p_secret text,
  p_loop_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_previous_dream_at timestamptz;
begin
  if not private.cron_secret_is_valid(p_secret) then
    raise exception 'Not authorised';
  end if;

  select run.project_id into v_project_id
  from public.loop_runs run
  where run.id = p_loop_id;

  if v_project_id is null then
    raise exception 'Loop not found';
  end if;

  select max(run.completed_at) into v_previous_dream_at
  from public.loop_runs run
  where run.project_id = v_project_id
    and run.loop_type = 'daily'
    and run.is_dream
    and run.status = 'complete'
    and run.id <> p_loop_id;

  return jsonb_build_object(
    'reasoning_nodes',
      coalesce((
        select jsonb_agg(to_jsonb(node) order by node.created_at)
        from public.reasoning_nodes node
        where node.project_id = v_project_id
      ), '[]'::jsonb),
    'reasoning_edges',
      coalesce((
        select jsonb_agg(to_jsonb(edge) order by edge.created_at)
        from public.reasoning_edges edge
        where edge.project_id = v_project_id
      ), '[]'::jsonb),
    'new_reasoning_activity',
      coalesce((
        select jsonb_agg(to_jsonb(node) order by node.updated_at)
        from public.reasoning_nodes node
        where node.project_id = v_project_id
          and (
            v_previous_dream_at is null
            or node.updated_at > v_previous_dream_at
          )
      ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_scheduled_reasoning_context(
  p_secret text,
  p_loop_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_scheduled_reasoning_context(p_secret, p_loop_id);
$$;

revoke all on function private.get_scheduled_reasoning_context(text, uuid)
  from public, anon, authenticated;
revoke all on function public.get_scheduled_reasoning_context(text, uuid)
  from public, anon, authenticated;
grant execute on function private.get_scheduled_reasoning_context(text, uuid)
  to anon;
grant execute on function public.get_scheduled_reasoning_context(text, uuid)
  to anon;

-- Preserve the new structured fields without replacing the proven scheduled
-- completion transaction.
create or replace function private.complete_scheduled_loop_with_reasoning(
  p_secret text,
  p_loop_id uuid,
  p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.cron_secret_is_valid(p_secret) then
    raise exception 'Not authorised';
  end if;

  perform private.complete_scheduled_loop(p_secret, p_loop_id, p_result);

  update public.loop_insights insight
  set
    change_details = coalesce(p_result -> 'changeDetails', '[]'::jsonb),
    reasoning_model = coalesce(
      p_result -> 'reasoning',
      '{"nodes":[],"edges":[]}'::jsonb
    ),
    decision_alerts = coalesce(p_result -> 'decisionAlerts', '[]'::jsonb)
  where insight.loop_run_id = p_loop_id;
end;
$$;

create or replace function public.complete_scheduled_loop(
  p_secret text,
  p_loop_id uuid,
  p_result jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_scheduled_loop_with_reasoning(
    p_secret,
    p_loop_id,
    p_result
  );
$$;

revoke all on function private.complete_scheduled_loop_with_reasoning(
  text,
  uuid,
  jsonb
) from public, anon, authenticated;
grant execute on function private.complete_scheduled_loop_with_reasoning(
  text,
  uuid,
  jsonb
) to anon;
revoke all on function public.complete_scheduled_loop(text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_scheduled_loop(text, uuid, jsonb)
  to anon;

-- A standalone ledger contribution is genuine new work and should wake the
-- next Dream even when the document itself was untouched.
create or replace function private.claim_due_loop_runs(p_secret text)
returns setof public.loop_runs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.cron_secret_is_valid(p_secret) then
    raise exception 'Not authorised';
  end if;

  return query
  with due as (
    select
      project.id,
      (
        select max(run.completed_at)
        from public.loop_runs run
        where run.project_id = project.id
          and run.loop_type = 'daily'
          and run.is_dream
          and run.status = 'complete'
      ) as last_dream_at
    from public.projects project
    where project.status = 'active'
      and project.next_daily_loop_at <= now()
      and not exists (
        select 1
        from public.loop_runs pending_run
        join public.loop_insights pending_insight
          on pending_insight.loop_run_id = pending_run.id
        where pending_run.project_id = project.id
          and pending_run.loop_type = 'daily'
          and pending_run.is_dream
          and pending_run.status = 'complete'
          and pending_insight.accepted_at is null
          and coalesce(pending_insight.proposal ->> 'content', '') <> ''
      )
    for update of project skip locked
  ),
  active as (
    select due_project.id
    from due due_project
    where due_project.last_dream_at is null
      or exists (
        select 1 from public.yjs_checkpoints checkpoint
        where checkpoint.project_id = due_project.id
          and checkpoint.reason <> 'dream'
          and checkpoint.created_at > due_project.last_dream_at
      )
      or exists (
        select 1 from public.sources source
        where source.project_id = due_project.id
          and source.updated_at > due_project.last_dream_at
      )
      or exists (
        select 1 from public.questions question
        where question.project_id = due_project.id
          and question.updated_at > due_project.last_dream_at
      )
      or exists (
        select 1 from public.decisions decision
        where decision.project_id = due_project.id
          and decision.updated_at > due_project.last_dream_at
      )
      or exists (
        select 1 from public.comments comment
        where comment.project_id = due_project.id
          and comment.updated_at > due_project.last_dream_at
      )
      or exists (
        select 1 from public.branches branch
        where branch.project_id = due_project.id
          and branch.updated_at > due_project.last_dream_at
      )
      or exists (
        select 1 from public.reasoning_nodes node
        where node.project_id = due_project.id
          and node.updated_at > due_project.last_dream_at
      )
  ),
  inserted as (
    insert into public.loop_runs (
      project_id,
      loop_type,
      idempotency_key,
      progress_stage,
      progress_percent,
      is_dream
    )
    select
      active_project.id,
      'daily'::public.loop_type,
      'dream:' || active_project.id::text || ':' ||
        (now() at time zone 'utc')::date::text,
      'Dream queued',
      0,
      true
    from active active_project
    on conflict (idempotency_key) do nothing
    returning *
  ),
  advanced as (
    update public.projects project
    set next_daily_loop_at = project.next_daily_loop_at + interval '1 day'
    from due due_project
    where project.id = due_project.id
    returning project.id
  )
  select inserted_run.* from inserted inserted_run;

  return query
  with due as (
    select project.id
    from public.projects project
    where project.status = 'active'
      and project.next_weekly_loop_at <= now()
    for update skip locked
  ),
  inserted as (
    insert into public.loop_runs (
      project_id,
      loop_type,
      idempotency_key,
      progress_stage,
      progress_percent
    )
    select
      due_project.id,
      'weekly'::public.loop_type,
      'weekly:' || due_project.id::text || ':' ||
        to_char(now() at time zone 'utc', 'IYYY-IW'),
      'Scheduled',
      0
    from due due_project
    on conflict (idempotency_key) do nothing
    returning *
  ),
  advanced as (
    update public.projects project
    set next_weekly_loop_at = project.next_weekly_loop_at + interval '1 week'
    from due due_project
    where project.id = due_project.id
    returning project.id
  )
  select inserted_run.* from inserted inserted_run;
end;
$$;
