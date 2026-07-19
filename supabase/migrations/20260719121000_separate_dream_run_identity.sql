-- Dreams are a distinct product workflow from the legacy daily Loop. Give
-- them their own idempotency namespace and only use genuine Dreams as the
-- activity boundary for the next overnight run.

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
      'dream:' || a.id::text || ':' || (now() at time zone 'utc')::date::text,
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
    and lr.is_dream
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
