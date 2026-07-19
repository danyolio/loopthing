-- Daily Loops existed before the overnight Dream product contract. Preserve
-- their history without relabelling or auto-applying them as Dream versions.

alter table public.loop_runs
  add column is_dream boolean not null default false;

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
          and lr.is_dream
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
          and pending_run.is_dream
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
      project_id,
      loop_type,
      idempotency_key,
      progress_stage,
      progress_percent,
      is_dream
    )
    select
      a.id,
      'daily'::public.loop_type,
      'daily:' || a.id::text || ':' || (now() at time zone 'utc')::date::text,
      'Dream queued',
      0,
      true
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
  v_is_dream boolean;
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

  select lr.is_dream into v_is_dream
  from public.loop_runs lr
  where lr.id = v_insight.loop_run_id
    and lr.status = 'complete';

  if v_is_dream is distinct from true then
    raise exception 'Only completed overnight Dreams can be applied automatically';
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
