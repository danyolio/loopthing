-- Present each Dream as an attributable Before -> After change set, and let a
-- project owner create or refresh several email-bound invitations atomically.

alter table public.loop_insights
  add column change_attribution jsonb not null default
    '{"directives":[],"independent":[],"preserved":[]}'::jsonb;

alter table public.document_versions
  add column base_version_id uuid references public.document_versions(id)
    on delete set null;

alter table public.document_versions
  drop constraint if exists document_versions_source_check;

alter table public.document_versions
  add constraint document_versions_source_check
  check (source in (
    'human',
    'ai_proposal',
    'restore',
    'pre_dream',
    'dream'
  ));

create index document_versions_base_version_id_idx
  on public.document_versions (base_version_id);

create unique index document_versions_one_pre_dream_per_run_idx
  on public.document_versions (loop_run_id)
  where source = 'pre_dream' and loop_run_id is not null;

-- Existing Dreams already point at their resulting checkpoint. Reveal the
-- immediately preceding checkpoint as their explicit, restorable base.
with candidates as (
  select
    dv.project_id,
    dv.document_id,
    previous.id as checkpoint_id,
    dv.created_by,
    dv.created_at,
    dv.loop_run_id
  from public.document_versions dv
  join public.yjs_checkpoints result
    on result.id = dv.checkpoint_id
  join lateral (
    select c.id
    from public.yjs_checkpoints c
    where c.document_id = dv.document_id
      and c.sequence < result.sequence
    order by c.sequence desc
    limit 1
  ) previous on true
  where dv.source = 'dream'
    and dv.loop_run_id is not null
    and dv.base_version_id is null
),
inserted as (
  insert into public.document_versions (
    project_id,
    document_id,
    checkpoint_id,
    label,
    source,
    rationale,
    created_by,
    created_at,
    loop_run_id
  )
  select
    candidate.project_id,
    candidate.document_id,
    candidate.checkpoint_id,
    'Before Dream · '
      || to_char(candidate.created_at at time zone 'utc', 'DD Mon YYYY'),
    'pre_dream',
    'Canonical document immediately before this Dream.',
    candidate.created_by,
    candidate.created_at - interval '1 microsecond',
    candidate.loop_run_id
  from candidates candidate
  on conflict (loop_run_id)
    where source = 'pre_dream' and loop_run_id is not null
  do nothing
  returning id, loop_run_id
)
update public.document_versions dream
set base_version_id = base.id
from public.document_versions base
where dream.source = 'dream'
  and dream.base_version_id is null
  and base.source = 'pre_dream'
  and base.loop_run_id = dream.loop_run_id;

-- Give existing Dream reports a useful first approximation of provenance.
-- Notes contributed before the run are explicit direction; the Dream's
-- existing change list records its editorial development.
update public.loop_insights insight
set change_attribution = jsonb_build_object(
  'directives',
    coalesce((
      select jsonb_agg(comment.body order by comment.created_at)
      from public.comments comment
      where comment.project_id = insight.project_id
        and comment.updated_at <= run.created_at
        and comment.updated_at > coalesce((
          select max(previous.completed_at)
          from public.loop_runs previous
          where previous.project_id = run.project_id
            and previous.is_dream
            and previous.status = 'complete'
            and previous.completed_at < run.created_at
        ), '-infinity'::timestamptz)
    ), '[]'::jsonb),
  'independent', insight.what_changed,
  'preserved', '[]'::jsonb
)
from public.loop_runs run
where run.id = insight.loop_run_id
  and run.is_dream;

create or replace function private.complete_scheduled_loop(
  p_secret text,
  p_loop_id uuid,
  p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  if not private.cron_secret_is_valid(p_secret) then
    raise exception 'Not authorised';
  end if;

  select project_id into v_project_id
  from public.loop_runs
  where id = p_loop_id
  for update;

  if v_project_id is null then
    raise exception 'Loop not found';
  end if;

  insert into public.loop_insights (
    loop_run_id,
    project_id,
    material_change,
    summary,
    what_changed,
    why_it_matters,
    unresolved,
    evidence,
    proposal,
    next_action,
    thinking_evolution,
    change_attribution
  )
  values (
    p_loop_id,
    v_project_id,
    coalesce((p_result ->> 'materialChange')::boolean, false),
    coalesce(p_result ->> 'summary', ''),
    coalesce(p_result -> 'whatChanged', '[]'::jsonb),
    coalesce(p_result ->> 'whyItMatters', ''),
    coalesce(p_result -> 'unresolved', '[]'::jsonb),
    coalesce(p_result -> 'evidence', '[]'::jsonb),
    coalesce(p_result -> 'proposal', '{}'::jsonb),
    coalesce(p_result ->> 'nextAction', ''),
    coalesce(p_result ->> 'thinkingEvolution', ''),
    coalesce(
      p_result -> 'changeAttribution',
      jsonb_build_object(
        'directives', '[]'::jsonb,
        'independent', coalesce(p_result -> 'whatChanged', '[]'::jsonb),
        'preserved', '[]'::jsonb
      )
    )
  )
  on conflict (loop_run_id) do update set
    material_change = excluded.material_change,
    summary = excluded.summary,
    what_changed = excluded.what_changed,
    why_it_matters = excluded.why_it_matters,
    unresolved = excluded.unresolved,
    evidence = excluded.evidence,
    proposal = excluded.proposal,
    next_action = excluded.next_action,
    thinking_evolution = excluded.thinking_evolution,
    change_attribution = excluded.change_attribution;

  update public.loop_runs
  set
    status = 'complete',
    progress_stage = 'Complete',
    progress_percent = 100,
    completed_at = now(),
    error_message = null
  where id = p_loop_id;
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
  v_base_checkpoint_id uuid;
  v_base_version_id uuid;
  v_checkpoint_id uuid;
  v_version_id uuid;
  v_sequence bigint;
begin
  select * into v_insight
  from public.loop_insights insight
  where insight.id = p_insight_id
  for update;

  if v_insight.id is null
    or not private.can_edit_project(v_insight.project_id)
  then
    raise exception 'Not authorised';
  end if;

  select run.is_dream into v_is_dream
  from public.loop_runs run
  where run.id = v_insight.loop_run_id
    and run.status = 'complete';

  if v_is_dream is distinct from true then
    raise exception 'Only completed overnight Dreams can be applied automatically';
  end if;

  if v_insight.accepted_at is not null then
    select version.id into v_version_id
    from public.document_versions version
    where version.insight_id = v_insight.id;
    return v_version_id;
  end if;

  if coalesce(v_insight.proposal ->> 'content', '') = '' then
    raise exception 'Dream has no rewritten document';
  end if;

  select document.id, document.current_checkpoint_id
  into v_document_id, v_base_checkpoint_id
  from public.documents document
  where document.project_id = v_insight.project_id;

  if v_document_id is null or v_base_checkpoint_id is null then
    raise exception 'Current document checkpoint not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_document_id::text, 0));

  insert into public.document_versions (
    project_id,
    document_id,
    checkpoint_id,
    label,
    source,
    rationale,
    created_by,
    loop_run_id
  )
  values (
    v_insight.project_id,
    v_document_id,
    v_base_checkpoint_id,
    'Before Dream · ' || to_char(now() at time zone 'utc', 'DD Mon YYYY'),
    'pre_dream',
    'Canonical document immediately before this Dream.',
    (select auth.uid()),
    v_insight.loop_run_id
  )
  returning id into v_base_version_id;

  select coalesce(max(checkpoint.sequence), 0) + 1
  into v_sequence
  from public.yjs_checkpoints checkpoint
  where checkpoint.document_id = v_document_id;

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
    insight_id,
    base_version_id
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
    v_insight.id,
    v_base_version_id
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
      'base_checkpoint_id', v_base_checkpoint_id,
      'base_version_id', v_base_version_id,
      'checkpoint_id', v_checkpoint_id
    )
  );

  return v_version_id;
end;
$$;

create or replace function public.create_or_refresh_invitations(
  p_project_id uuid,
  p_invitations jsonb
)
returns setof public.invitations
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_project_owner(p_project_id) then
    raise exception 'Owner access required';
  end if;

  if jsonb_typeof(p_invitations) is distinct from 'array' then
    raise exception 'Invitations must be an array';
  end if;

  if jsonb_array_length(p_invitations) < 1
    or jsonb_array_length(p_invitations) > 20 then
    raise exception 'Provide between 1 and 20 invitations';
  end if;

  return query
  insert into public.invitations (
    project_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  select
    p_project_id,
    lower(trim(item ->> 'email')),
    (item ->> 'role')::public.project_role,
    item ->> 'tokenHash',
    (select auth.uid()),
    now() + interval '7 days'
  from jsonb_array_elements(p_invitations) item
  on conflict (project_id, lower(email))
    where accepted_at is null
  do update set
    role = excluded.role,
    token_hash = excluded.token_hash,
    invited_by = excluded.invited_by,
    expires_at = excluded.expires_at
  returning public.invitations.*;
end;
$$;

revoke all on function public.apply_daily_dream(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_daily_dream(uuid, text, text)
  to authenticated;

revoke all on function public.create_or_refresh_invitations(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_or_refresh_invitations(uuid, jsonb)
  to authenticated;
