-- Overnight Dreams turn each active project's new daytime contributions into a
-- complete, restorable document version. The browser supplies the valid Yjs
-- state when the first editor opens the finished Dream.

alter table public.yjs_checkpoints
  drop constraint if exists yjs_checkpoints_reason_check;

alter table public.yjs_checkpoints
  add constraint yjs_checkpoints_reason_check
  check (reason in (
    'initial',
    'autosave',
    'manual',
    'accepted_proposal',
    'restored',
    'dream'
  ));

alter table public.document_versions
  drop constraint if exists document_versions_source_check;

alter table public.document_versions
  add constraint document_versions_source_check
  check (source in ('human', 'ai_proposal', 'restore', 'dream'));

alter table public.document_versions
  add column loop_run_id uuid references public.loop_runs(id) on delete set null,
  add column insight_id uuid unique references public.loop_insights(id) on delete set null;

create index document_versions_loop_run_id_idx
  on public.document_versions (loop_run_id);
create index document_versions_insight_id_idx
  on public.document_versions (insight_id);

-- Insights produced before this feature were reviewable Loop proposals, not
-- auto-applied Dreams. Keep them visible without treating them as pending work.
update public.loop_insights li
set accepted_at = coalesce(li.accepted_at, now())
from public.loop_runs lr
where lr.id = li.loop_run_id
  and lr.loop_type = 'daily'
  and li.accepted_at is null;

-- New projects should dream during the Melbourne overnight window. 17:00 UTC
-- lands at 03:00 AEST / 04:00 AEDT and remains inside the requested window.
alter table public.projects
  alter column next_daily_loop_at set default (
    (
      date_trunc('day', now() at time zone 'utc')
      + interval '17 hours'
      + case
          when (now() at time zone 'utc')
            >= date_trunc('day', now() at time zone 'utc') + interval '17 hours'
          then interval '1 day'
          else interval '0 days'
        end
    ) at time zone 'utc'
  );

update public.projects
set next_daily_loop_at = (
  date_trunc('day', now() at time zone 'utc')
  + interval '17 hours'
  + case
      when (now() at time zone 'utc')
        >= date_trunc('day', now() at time zone 'utc') + interval '17 hours'
      then interval '1 day'
      else interval '0 days'
    end
) at time zone 'utc'
where status = 'active';

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
      p.id,
      (
        select max(lr.completed_at)
        from public.loop_runs lr
        where lr.project_id = p.id
          and lr.loop_type = 'daily'
          and lr.status = 'complete'
      ) as last_dream_at
    from public.projects p
    where p.status = 'active'
      and p.next_daily_loop_at <= now()
      and not exists (
        select 1
        from public.loop_runs pending_run
        join public.loop_insights pending_insight
          on pending_insight.loop_run_id = pending_run.id
        where pending_run.project_id = p.id
          and pending_run.loop_type = 'daily'
          and pending_run.status = 'complete'
          and pending_insight.accepted_at is null
          and coalesce(pending_insight.proposal ->> 'content', '') <> ''
      )
    for update of p skip locked
  ),
  active as (
    select d.id
    from due d
    where d.last_dream_at is null
      or exists (
        select 1
        from public.yjs_checkpoints c
        where c.project_id = d.id
          and c.reason <> 'dream'
          and c.created_at > d.last_dream_at
      )
      or exists (
        select 1
        from public.sources s
        where s.project_id = d.id
          and s.updated_at > d.last_dream_at
      )
      or exists (
        select 1
        from public.questions q
        where q.project_id = d.id
          and q.updated_at > d.last_dream_at
      )
      or exists (
        select 1
        from public.decisions decision
        where decision.project_id = d.id
          and decision.updated_at > d.last_dream_at
      )
      or exists (
        select 1
        from public.comments c
        where c.project_id = d.id
          and c.updated_at > d.last_dream_at
      )
      or exists (
        select 1
        from public.branches b
        where b.project_id = d.id
          and b.updated_at > d.last_dream_at
      )
  ),
  inserted as (
    insert into public.loop_runs (
      project_id, loop_type, idempotency_key, progress_stage, progress_percent
    )
    select
      a.id,
      'daily'::public.loop_type,
      'daily:' || a.id::text || ':' || (now() at time zone 'utc')::date::text,
      'Dream queued',
      0
    from active a
    on conflict (idempotency_key) do nothing
    returning *
  ),
  advanced as (
    update public.projects p
    set next_daily_loop_at = p.next_daily_loop_at + interval '1 day'
    from due d
    where p.id = d.id
    returning p.id
  )
  select i.* from inserted i;

  return query
  with due as (
    select p.id
    from public.projects p
    where p.status = 'active'
      and p.next_weekly_loop_at <= now()
    for update skip locked
  ),
  inserted as (
    insert into public.loop_runs (
      project_id, loop_type, idempotency_key, progress_stage, progress_percent
    )
    select
      d.id,
      'weekly'::public.loop_type,
      'weekly:' || d.id::text || ':' || to_char(now() at time zone 'utc', 'IYYY-IW'),
      'Scheduled',
      0
    from due d
    on conflict (idempotency_key) do nothing
    returning *
  ),
  advanced as (
    update public.projects p
    set next_weekly_loop_at = p.next_weekly_loop_at + interval '1 week'
    from due d
    where p.id = d.id
    returning p.id
  )
  select i.* from inserted i;
end;
$$;

create or replace function private.get_scheduled_loop_context(
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

  select lr.project_id into v_project_id
  from public.loop_runs lr
  where lr.id = p_loop_id;

  if v_project_id is null then
    raise exception 'Loop not found';
  end if;

  select max(lr.completed_at) into v_previous_dream_at
  from public.loop_runs lr
  where lr.project_id = v_project_id
    and lr.loop_type = 'daily'
    and lr.status = 'complete'
    and lr.id <> p_loop_id;

  return jsonb_build_object(
    'project',
      (select to_jsonb(p) from public.projects p where p.id = v_project_id),
    'document',
      (select to_jsonb(d) from public.documents d where d.project_id = v_project_id),
    'sources',
      coalesce((
        select jsonb_agg(to_jsonb(s) order by s.created_at desc)
        from public.sources s
        where s.project_id = v_project_id
      ), '[]'::jsonb),
    'questions',
      coalesce((
        select jsonb_agg(to_jsonb(q) order by q.created_at desc)
        from public.questions q
        where q.project_id = v_project_id
      ), '[]'::jsonb),
    'decisions',
      coalesce((
        select jsonb_agg(to_jsonb(d) order by d.created_at desc)
        from public.decisions d
        where d.project_id = v_project_id
      ), '[]'::jsonb),
    'comments',
      coalesce((
        select jsonb_agg(to_jsonb(c) order by c.created_at desc)
        from public.comments c
        where c.project_id = v_project_id
      ), '[]'::jsonb),
    'branches',
      coalesce((
        select jsonb_agg(to_jsonb(b) order by b.created_at desc)
        from public.branches b
        where b.project_id = v_project_id
      ), '[]'::jsonb),
    'recent_loops',
      coalesce((
        select jsonb_agg(recent.item)
        from (
          select to_jsonb(li) as item
          from public.loop_insights li
          where li.project_id = v_project_id
          order by li.created_at desc
          limit 8
        ) recent
      ), '[]'::jsonb),
    'new_activity',
      jsonb_build_object(
        'since', v_previous_dream_at,
        'checkpoints', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'plain_text', c.plain_text,
              'reason', c.reason,
              'created_at', c.created_at,
              'created_by', c.created_by
            )
            order by c.created_at
          )
          from public.yjs_checkpoints c
          where c.project_id = v_project_id
            and c.reason <> 'dream'
            and (v_previous_dream_at is null or c.created_at > v_previous_dream_at)
        ), '[]'::jsonb),
        'sources', coalesce((
          select jsonb_agg(to_jsonb(s) order by s.created_at)
          from public.sources s
          where s.project_id = v_project_id
            and (v_previous_dream_at is null or s.updated_at > v_previous_dream_at)
        ), '[]'::jsonb),
        'questions', coalesce((
          select jsonb_agg(to_jsonb(q) order by q.created_at)
          from public.questions q
          where q.project_id = v_project_id
            and (v_previous_dream_at is null or q.updated_at > v_previous_dream_at)
        ), '[]'::jsonb),
        'decisions', coalesce((
          select jsonb_agg(to_jsonb(d) order by d.created_at)
          from public.decisions d
          where d.project_id = v_project_id
            and (v_previous_dream_at is null or d.updated_at > v_previous_dream_at)
        ), '[]'::jsonb),
        'comments', coalesce((
          select jsonb_agg(to_jsonb(c) order by c.created_at)
          from public.comments c
          where c.project_id = v_project_id
            and (v_previous_dream_at is null or c.updated_at > v_previous_dream_at)
        ), '[]'::jsonb),
        'branches', coalesce((
          select jsonb_agg(to_jsonb(b) order by b.created_at)
          from public.branches b
          where b.project_id = v_project_id
            and (v_previous_dream_at is null or b.updated_at > v_previous_dream_at)
        ), '[]'::jsonb)
      )
  );
end;
$$;

create or replace function public.apply_daily_dream(
  p_insight_id uuid,
  p_state_base64 text,
  p_plain_text text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_insight public.loop_insights%rowtype;
  v_document_id uuid;
  v_loop_type public.loop_type;
  v_checkpoint_id uuid;
  v_version_id uuid;
  v_sequence bigint;
begin
  select * into v_insight
  from public.loop_insights li
  where li.id = p_insight_id
  for update;

  if v_insight.id is null
    or not private.can_edit_project(v_insight.project_id)
  then
    raise exception 'Not authorised';
  end if;

  select lr.loop_type into v_loop_type
  from public.loop_runs lr
  where lr.id = v_insight.loop_run_id
    and lr.status = 'complete';

  if v_loop_type is distinct from 'daily'::public.loop_type then
    raise exception 'Only completed daily Dreams can be applied automatically';
  end if;

  if v_insight.accepted_at is not null then
    select dv.id into v_version_id
    from public.document_versions dv
    where dv.insight_id = v_insight.id;
    return v_version_id;
  end if;

  if coalesce(v_insight.proposal ->> 'content', '') = '' then
    raise exception 'Dream has no rewritten document';
  end if;

  select d.id into v_document_id
  from public.documents d
  where d.project_id = v_insight.project_id;

  if v_document_id is null then
    raise exception 'Document not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_document_id::text, 0));

  select coalesce(max(c.sequence), 0) + 1
  into v_sequence
  from public.yjs_checkpoints c
  where c.document_id = v_document_id;

  insert into public.yjs_checkpoints (
    project_id,
    document_id,
    sequence,
    state,
    plain_text,
    reason,
    created_by
  )
  values (
    v_insight.project_id,
    v_document_id,
    v_sequence,
    decode(p_state_base64, 'base64'),
    coalesce(p_plain_text, ''),
    'dream',
    (select auth.uid())
  )
  returning id into v_checkpoint_id;

  update public.documents
  set
    current_checkpoint_id = v_checkpoint_id,
    content_text = coalesce(p_plain_text, ''),
    updated_at = now()
  where id = v_document_id;

  insert into public.document_versions (
    project_id,
    document_id,
    checkpoint_id,
    label,
    source,
    rationale,
    created_by,
    loop_run_id,
    insight_id
  )
  values (
    v_insight.project_id,
    v_document_id,
    v_checkpoint_id,
    'Overnight Dream · ' || to_char(now() at time zone 'utc', 'DD Mon YYYY'),
    'dream',
    coalesce(v_insight.proposal ->> 'rationale', v_insight.summary),
    (select auth.uid()),
    v_insight.loop_run_id,
    v_insight.id
  )
  returning id into v_version_id;

  update public.loop_insights
  set
    accepted_by = (select auth.uid()),
    accepted_at = now()
  where id = v_insight.id;

  insert into public.project_events (
    project_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values (
    v_insight.project_id,
    (select auth.uid()),
    'dream_applied',
    'document_version',
    v_version_id::text,
    jsonb_build_object(
      'insight_id', v_insight.id,
      'loop_run_id', v_insight.loop_run_id,
      'checkpoint_id', v_checkpoint_id
    )
  );

  return v_version_id;
end;
$$;

revoke all on function public.apply_daily_dream(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_daily_dream(uuid, text, text)
  to authenticated;
