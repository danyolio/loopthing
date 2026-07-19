create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create type public.project_role as enum ('owner', 'editor', 'viewer');
create type public.loop_type as enum ('light', 'daily', 'weekly');
create type public.loop_status as enum ('queued', 'collecting', 'analysing', 'synthesising', 'saving', 'complete', 'failed');
create type public.branch_status as enum ('open', 'accepted', 'rejected', 'superseded');
create type public.question_status as enum ('open', 'resolved', 'parked');
create type public.decision_status as enum ('proposed', 'decided', 'reversed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  next_daily_loop_at timestamptz not null default (date_trunc('day', now() at time zone 'utc') + interval '1 day 8 hours'),
  next_weekly_loop_at timestamptz not null default (date_trunc('week', now() at time zone 'utc') + interval '1 week 8 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role public.project_role not null check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index invitations_project_email_open_idx
  on public.invitations (project_id, lower(email))
  where accepted_at is null;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default 'Working document',
  content_text text not null default '',
  current_checkpoint_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create table public.yjs_checkpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  sequence bigint not null,
  state bytea not null,
  plain_text text not null default '',
  reason text not null default 'autosave' check (reason in ('initial', 'autosave', 'manual', 'accepted_proposal', 'restored')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, sequence)
);

alter table public.documents
  add constraint documents_current_checkpoint_id_fkey
  foreign key (current_checkpoint_id)
  references public.yjs_checkpoints(id)
  on delete set null;

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  checkpoint_id uuid not null references public.yjs_checkpoints(id) on delete restrict,
  label text not null,
  source text not null default 'human' check (source in ('human', 'ai_proposal', 'restore')),
  rationale text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  anchor jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  url text,
  excerpt text not null default '',
  storage_path text,
  source_type text not null default 'link' check (source_type in ('link', 'file', 'note', 'transcript')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (url is not null or storage_path is not null or excerpt <> '')
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  statement text not null check (char_length(statement) between 1 and 5000),
  why_it_matters text not null default '',
  status public.question_status not null default 'open',
  created_by uuid not null references auth.users(id) on delete restrict,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  statement text not null check (char_length(statement) between 1 and 5000),
  rationale text not null default '',
  status public.decision_status not null default 'proposed',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  base_checkpoint_id uuid references public.yjs_checkpoints(id) on delete set null,
  title text not null,
  rationale text not null,
  proposed_content_text text not null,
  status public.branch_status not null default 'open',
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loop_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  loop_type public.loop_type not null,
  status public.loop_status not null default 'queued',
  progress_stage text not null default 'Queued',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  idempotency_key text not null unique,
  workflow_run_id text,
  context_checkpoint_ids uuid[] not null default '{}',
  triggered_by uuid references auth.users(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.loop_insights (
  id uuid primary key default gen_random_uuid(),
  loop_run_id uuid not null unique references public.loop_runs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  material_change boolean not null,
  summary text not null,
  what_changed jsonb not null default '[]'::jsonb,
  why_it_matters text not null,
  unresolved jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  proposal jsonb not null default '{}'::jsonb,
  next_action text not null,
  thinking_evolution text not null default '',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.project_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.project_templates (
  slug text primary key,
  title text not null,
  description text not null,
  initial_document text not null,
  created_at timestamptz not null default now()
);

create table private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into private.app_config (key, value)
values ('cron_secret_sha256', '8fc22e4e6602ec3e8ef9779716fcb7257b11ef9dc0d847fd7c8bd5505f8408f4');

insert into public.project_templates (slug, title, description, initial_document)
values
  ('strategy', 'Strategy', 'Turn a changing strategic question into explicit choices, evidence, and tests.', E'# Strategic question\n\nWhat are we trying to decide, and by when?\n\n## Current thesis\n\nWrite the strongest current version here.\n\n## Evidence\n\nWhat supports or challenges it?\n\n## Constraints\n\nWhat cannot be ignored?'),
  ('research', 'Research', 'Connect claims to sources and keep unresolved questions visible.', E'# Research question\n\nWhat do we need to understand?\n\n## Current synthesis\n\nState what the evidence supports today.\n\n## Sources and claims\n\nAdd sources beside the claims they support.\n\n## Unknowns\n\nWhat would change the conclusion?'),
  ('investment', 'Investment decision', 'Track the thesis, counter-case, evidence, risks, and decision rationale.', E'# Investment thesis\n\nWhat must be true for this to work?\n\n## Evidence\n\n## Counter-case\n\n## Risks\n\n## Decision and rationale'),
  ('planning', 'Planning', 'Keep a plan connected to changing constraints, dependencies, and decisions.', E'# Outcome\n\nWhat should be true when this plan succeeds?\n\n## Plan\n\n## Dependencies\n\n## Risks\n\n## Decisions'),
  ('design-review', 'Design review', 'Evaluate a design against goals, evidence, alternatives, and trade-offs.', E'# Design intent\n\nWhat problem should this design solve?\n\n## Current direction\n\n## Evidence and feedback\n\n## Alternatives\n\n## Decision'),
  ('hiring', 'Hiring decision', 'Compare candidates against explicit evidence and role requirements.', E'# Role outcome\n\nWhat must this person achieve?\n\n## Evaluation criteria\n\n## Evidence\n\n## Risks and unknowns\n\n## Decision rationale')
on conflict (slug) do nothing;

create index project_members_user_id_idx on public.project_members (user_id, project_id);
create index invitations_email_idx on public.invitations (lower(email), expires_at);
create index documents_project_id_idx on public.documents (project_id);
create index yjs_checkpoints_document_created_idx on public.yjs_checkpoints (document_id, created_at desc);
create index document_versions_document_created_idx on public.document_versions (document_id, created_at desc);
create index comments_document_created_idx on public.comments (document_id, created_at desc);
create index sources_project_created_idx on public.sources (project_id, created_at desc);
create index questions_project_status_idx on public.questions (project_id, status);
create index decisions_project_status_idx on public.decisions (project_id, status);
create index branches_project_status_idx on public.branches (project_id, status);
create index loop_runs_project_created_idx on public.loop_runs (project_id, created_at desc);
create index loop_runs_status_idx on public.loop_runs (status, created_at);
create index loop_insights_project_created_idx on public.loop_insights (project_id, created_at desc);
create index project_events_project_created_idx on public.project_events (project_id, created_at desc);
create index projects_daily_due_idx on public.projects (next_daily_loop_at) where status = 'active';
create index projects_weekly_due_idx on public.projects (next_weekly_loop_at) where status = 'active';

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role, invited_by)
  values (new.id, new.owner_id, 'owner', new.owner_id)
  on conflict (project_id, user_id) do update set role = 'owner';

  insert into public.documents (project_id, title, content_text, created_by)
  values (
    new.id,
    new.title,
    E'# ' || new.title || E'\n\nStart with the decision, question, or outcome this project needs to move forward.\n\n## Current understanding\n\n\n## Evidence\n\n\n## Open questions\n\n',
    new.owner_id
  );
  return new;
end;
$$;

create or replace function private.current_project_role(p_project_id uuid)
returns public.project_role
language sql
stable
security definer
set search_path = ''
as $$
  select pm.role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_project_role(p_project_id) in ('owner', 'editor'), false);
$$;

create or replace function private.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_project_role(p_project_id) = 'owner', false);
$$;

create or replace function private.safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function private.prevent_checkpoint_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Yjs checkpoints are immutable';
end;
$$;

create or replace function private.cron_secret_is_valid(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.app_config c
    where c.key = 'cron_secret_sha256'
      and c.value = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  );
$$;

revoke all on function private.current_project_role(uuid) from public;
revoke all on function private.is_project_member(uuid) from public;
revoke all on function private.can_edit_project(uuid) from public;
revoke all on function private.is_project_owner(uuid) from public;
revoke all on function private.cron_secret_is_valid(text) from public;
grant execute on function private.current_project_role(uuid) to authenticated;
grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.can_edit_project(uuid) to authenticated;
grant execute on function private.is_project_owner(uuid) to authenticated;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger projects_touch_updated_at before update on public.projects
for each row execute function private.touch_updated_at();
create trigger documents_touch_updated_at before update on public.documents
for each row execute function private.touch_updated_at();
create trigger comments_touch_updated_at before update on public.comments
for each row execute function private.touch_updated_at();
create trigger sources_touch_updated_at before update on public.sources
for each row execute function private.touch_updated_at();
create trigger questions_touch_updated_at before update on public.questions
for each row execute function private.touch_updated_at();
create trigger decisions_touch_updated_at before update on public.decisions
for each row execute function private.touch_updated_at();
create trigger branches_touch_updated_at before update on public.branches
for each row execute function private.touch_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create trigger on_project_created
after insert on public.projects
for each row execute function private.handle_new_project();

create trigger yjs_checkpoints_no_update
before update on public.yjs_checkpoints
for each row execute function private.prevent_checkpoint_mutation();

create or replace function public.save_yjs_checkpoint(
  p_project_id uuid,
  p_document_id uuid,
  p_state_base64 text,
  p_plain_text text,
  p_reason text default 'autosave'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_checkpoint_id uuid;
  v_sequence bigint;
begin
  if not private.can_edit_project(p_project_id) then
    raise exception 'Not authorised';
  end if;

  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.project_id = p_project_id
  ) then
    raise exception 'Document not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_document_id::text, 0));

  select coalesce(max(c.sequence), 0) + 1
  into v_sequence
  from public.yjs_checkpoints c
  where c.document_id = p_document_id;

  insert into public.yjs_checkpoints (
    project_id, document_id, sequence, state, plain_text, reason, created_by
  )
  values (
    p_project_id,
    p_document_id,
    v_sequence,
    decode(p_state_base64, 'base64'),
    coalesce(p_plain_text, ''),
    p_reason,
    (select auth.uid())
  )
  returning id into v_checkpoint_id;

  update public.documents
  set
    current_checkpoint_id = v_checkpoint_id,
    content_text = coalesce(p_plain_text, ''),
    updated_at = now()
  where id = p_document_id;

  if p_reason <> 'autosave' then
    insert into public.document_versions (
      project_id, document_id, checkpoint_id, label, source, rationale, created_by
    )
    values (
      p_project_id,
      p_document_id,
      v_checkpoint_id,
      initcap(replace(p_reason, '_', ' ')),
      case when p_reason = 'accepted_proposal' then 'ai_proposal' else 'human' end,
      '',
      (select auth.uid())
    );
  end if;

  return v_checkpoint_id;
end;
$$;

create or replace function public.restore_yjs_checkpoint(p_checkpoint_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source public.yjs_checkpoints%rowtype;
begin
  select * into v_source
  from public.yjs_checkpoints
  where id = p_checkpoint_id;

  if v_source.id is null or not private.can_edit_project(v_source.project_id) then
    raise exception 'Not authorised';
  end if;

  return public.save_yjs_checkpoint(
    v_source.project_id,
    v_source.document_id,
    encode(v_source.state, 'base64'),
    v_source.plain_text,
    'restored'
  );
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.invitations%rowtype;
  v_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));

  select * into v_invite
  from public.invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null
    and i.expires_at > now()
  for update;

  if v_invite.id is null or lower(v_invite.email) <> v_email then
    raise exception 'Invitation is invalid or expired';
  end if;

  insert into public.project_members (project_id, user_id, role, invited_by)
  values (v_invite.project_id, (select auth.uid()), v_invite.role, v_invite.invited_by)
  on conflict (project_id, user_id) do update set role = excluded.role;

  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.project_id;
end;
$$;

create or replace function public.claim_due_loop_runs(p_secret text)
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
    select p.id
    from public.projects p
    where p.status = 'active'
      and p.next_daily_loop_at <= now()
    for update skip locked
  ),
  inserted as (
    insert into public.loop_runs (
      project_id, loop_type, idempotency_key, progress_stage, progress_percent
    )
    select
      d.id,
      'daily'::public.loop_type,
      'daily:' || d.id::text || ':' || (now() at time zone 'utc')::date::text,
      'Scheduled',
      0
    from due d
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

create or replace function public.get_scheduled_loop_context(p_secret text, p_loop_id uuid)
returns jsonb
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

  select lr.project_id into v_project_id
  from public.loop_runs lr
  where lr.id = p_loop_id;

  if v_project_id is null then
    raise exception 'Loop not found';
  end if;

  return jsonb_build_object(
    'project', (select to_jsonb(p) from public.projects p where p.id = v_project_id),
    'document', (select to_jsonb(d) from public.documents d where d.project_id = v_project_id),
    'sources', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.sources s where s.project_id = v_project_id), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from public.questions q where q.project_id = v_project_id), '[]'::jsonb),
    'decisions', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.decisions d where d.project_id = v_project_id), '[]'::jsonb),
    'recent_loops', coalesce((
      select jsonb_agg(x)
      from (
        select to_jsonb(li) as x
        from public.loop_insights li
        where li.project_id = v_project_id
        order by li.created_at desc
        limit 8
      ) recent
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.complete_scheduled_loop(
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
    thinking_evolution
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
    coalesce(p_result ->> 'thinkingEvolution', '')
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
    thinking_evolution = excluded.thinking_evolution;

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

revoke all on function public.accept_invitation(text) from public;
revoke all on function public.claim_due_loop_runs(text) from public;
revoke all on function public.get_scheduled_loop_context(text, uuid) from public;
revoke all on function public.complete_scheduled_loop(text, uuid, jsonb) from public;
grant execute on function public.save_yjs_checkpoint(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.restore_yjs_checkpoint(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.claim_due_loop_runs(text) to anon;
grant execute on function public.get_scheduled_loop_context(text, uuid) to anon;
grant execute on function public.complete_scheduled_loop(text, uuid, jsonb) to anon;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invitations enable row level security;
alter table public.documents enable row level security;
alter table public.yjs_checkpoints enable row level security;
alter table public.document_versions enable row level security;
alter table public.comments enable row level security;
alter table public.sources enable row level security;
alter table public.questions enable row level security;
alter table public.decisions enable row level security;
alter table public.branches enable row level security;
alter table public.loop_runs enable row level security;
alter table public.loop_insights enable row level security;
alter table public.project_events enable row level security;
alter table public.project_templates enable row level security;

create policy profiles_select_authenticated on public.profiles
for select to authenticated using (true);
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy projects_select_member on public.projects
for select to authenticated
using (private.is_project_member(id) or owner_id = (select auth.uid()));
create policy projects_insert_owner on public.projects
for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy projects_update_owner on public.projects
for update to authenticated
using (private.is_project_owner(id))
with check (private.is_project_owner(id) and owner_id = (select auth.uid()));
create policy projects_delete_owner on public.projects
for delete to authenticated
using (private.is_project_owner(id));

create policy project_members_select_member on public.project_members
for select to authenticated
using (private.is_project_member(project_id));
create policy project_members_insert_owner on public.project_members
for insert to authenticated
with check (private.is_project_owner(project_id));
create policy project_members_update_owner on public.project_members
for update to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));
create policy project_members_delete_owner on public.project_members
for delete to authenticated
using (private.is_project_owner(project_id) and role <> 'owner');

create policy invitations_select_owner on public.invitations
for select to authenticated using (private.is_project_owner(project_id));
create policy invitations_insert_owner on public.invitations
for insert to authenticated
with check (
  private.is_project_owner(project_id)
  and invited_by = (select auth.uid())
  and role <> 'owner'
);
create policy invitations_update_owner on public.invitations
for update to authenticated
using (private.is_project_owner(project_id))
with check (private.is_project_owner(project_id));
create policy invitations_delete_owner on public.invitations
for delete to authenticated using (private.is_project_owner(project_id));

create policy documents_select_member on public.documents
for select to authenticated using (private.is_project_member(project_id));
create policy documents_insert_editor on public.documents
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));
create policy documents_update_editor on public.documents
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));
create policy documents_delete_owner on public.documents
for delete to authenticated using (private.is_project_owner(project_id));

create policy checkpoints_select_member on public.yjs_checkpoints
for select to authenticated using (private.is_project_member(project_id));
create policy checkpoints_insert_editor on public.yjs_checkpoints
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));

create policy versions_select_member on public.document_versions
for select to authenticated using (private.is_project_member(project_id));
create policy versions_insert_editor on public.document_versions
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));

create policy comments_select_member on public.comments
for select to authenticated using (private.is_project_member(project_id));
create policy comments_insert_member on public.comments
for insert to authenticated
with check (private.is_project_member(project_id) and author_id = (select auth.uid()));
create policy comments_update_author on public.comments
for update to authenticated
using (author_id = (select auth.uid()) or private.is_project_owner(project_id))
with check (author_id = (select auth.uid()) or private.is_project_owner(project_id));
create policy comments_delete_author on public.comments
for delete to authenticated
using (author_id = (select auth.uid()) or private.is_project_owner(project_id));

create policy sources_select_member on public.sources
for select to authenticated using (private.is_project_member(project_id));
create policy sources_insert_editor on public.sources
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));
create policy sources_update_editor on public.sources
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));
create policy sources_delete_editor on public.sources
for delete to authenticated using (private.can_edit_project(project_id));

create policy questions_select_member on public.questions
for select to authenticated using (private.is_project_member(project_id));
create policy questions_insert_editor on public.questions
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));
create policy questions_update_editor on public.questions
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));
create policy questions_delete_editor on public.questions
for delete to authenticated using (private.can_edit_project(project_id));

create policy decisions_select_member on public.decisions
for select to authenticated using (private.is_project_member(project_id));
create policy decisions_insert_editor on public.decisions
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));
create policy decisions_update_editor on public.decisions
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));
create policy decisions_delete_editor on public.decisions
for delete to authenticated using (private.can_edit_project(project_id));

create policy branches_select_member on public.branches
for select to authenticated using (private.is_project_member(project_id));
create policy branches_insert_editor on public.branches
for insert to authenticated
with check (private.can_edit_project(project_id) and created_by = (select auth.uid()));
create policy branches_update_editor on public.branches
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));
create policy branches_delete_editor on public.branches
for delete to authenticated using (private.can_edit_project(project_id));

create policy loop_runs_select_member on public.loop_runs
for select to authenticated using (private.is_project_member(project_id));
create policy loop_runs_insert_editor on public.loop_runs
for insert to authenticated
with check (private.can_edit_project(project_id) and triggered_by = (select auth.uid()));
create policy loop_runs_update_editor on public.loop_runs
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));

create policy loop_insights_select_member on public.loop_insights
for select to authenticated using (private.is_project_member(project_id));
create policy loop_insights_insert_editor on public.loop_insights
for insert to authenticated
with check (private.can_edit_project(project_id));
create policy loop_insights_update_editor on public.loop_insights
for update to authenticated
using (private.can_edit_project(project_id))
with check (private.can_edit_project(project_id));

create policy project_events_select_member on public.project_events
for select to authenticated using (private.is_project_member(project_id));
create policy project_events_insert_member on public.project_events
for insert to authenticated
with check (private.is_project_member(project_id) and actor_id = (select auth.uid()));

create policy project_templates_select_public on public.project_templates
for select to anon, authenticated using (true);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert on public.yjs_checkpoints to authenticated;
grant select, insert on public.document_versions to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.sources to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.decisions to authenticated;
grant select, insert, update, delete on public.branches to authenticated;
grant select, insert, update on public.loop_runs to authenticated;
grant select, insert, update on public.loop_insights to authenticated;
grant select, insert on public.project_events to authenticated;
grant select on public.project_templates to anon, authenticated;
grant usage, select on sequence public.project_events_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'loopthing-attachments',
  'loopthing-attachments',
  false,
  52428800,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'video/mp4'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy attachments_select_member on storage.objects
for select to authenticated
using (
  bucket_id = 'loopthing-attachments'
  and private.is_project_member(private.safe_uuid((storage.foldername(name))[1]))
);

create policy attachments_insert_editor on storage.objects
for insert to authenticated
with check (
  bucket_id = 'loopthing-attachments'
  and private.can_edit_project(private.safe_uuid((storage.foldername(name))[1]))
  and owner_id = (select auth.uid()::text)
);

create policy attachments_update_editor on storage.objects
for update to authenticated
using (
  bucket_id = 'loopthing-attachments'
  and private.can_edit_project(private.safe_uuid((storage.foldername(name))[1]))
)
with check (
  bucket_id = 'loopthing-attachments'
  and private.can_edit_project(private.safe_uuid((storage.foldername(name))[1]))
);

create policy attachments_delete_editor on storage.objects
for delete to authenticated
using (
  bucket_id = 'loopthing-attachments'
  and private.can_edit_project(private.safe_uuid((storage.foldername(name))[1]))
);
