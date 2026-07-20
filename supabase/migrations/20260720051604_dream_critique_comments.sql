-- Make conjecture and criticism durable Loop output. The comments themselves
-- stay immutable with their insight; project members can respond to and
-- disposition each intervention collaboratively.

alter table public.loop_insights
  add column critique_comments jsonb not null default '[]'::jsonb;

alter table public.loop_insights
  add constraint loop_insights_critique_comments_array_check
  check (jsonb_typeof(critique_comments) = 'array');

alter table public.loop_insights
  add constraint loop_insights_project_id_id_key
  unique (project_id, id);

create table public.critique_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  loop_insight_id uuid not null,
  comment_key text not null check (char_length(comment_key) between 1 and 120),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed', 'incorporated')),
  response text not null default ''
    check (char_length(response) <= 5000),
  feedback_comment_id uuid references public.comments(id) on delete set null,
  reviewed_by uuid not null references auth.users(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint critique_reviews_insight_fkey
    foreign key (project_id, loop_insight_id)
    references public.loop_insights(project_id, id)
    on delete cascade,
  unique (loop_insight_id, comment_key)
);

create index critique_reviews_project_insight_idx
  on public.critique_reviews (project_id, loop_insight_id);
create index critique_reviews_reviewed_by_idx
  on public.critique_reviews (reviewed_by);

create or replace function private.sync_critique_review_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_body text;
begin
  v_body := case new.status
    when 'open' then 'Response to a Loopthing intervention'
    when 'resolved' then 'Resolved a Loopthing intervention'
    when 'dismissed' then 'Dismissed a Loopthing intervention'
    when 'incorporated' then 'Incorporated a Loopthing intervention'
  end || case
    when nullif(trim(new.response), '') is null then '.'
    else E':\n\n' || trim(new.response)
  end;

  if new.feedback_comment_id is null then
    insert into public.comments (
      project_id,
      document_id,
      author_id,
      body,
      anchor
    )
    select
      new.project_id,
      document.id,
      new.reviewed_by,
      v_body,
      jsonb_build_object(
        'kind', 'critique_review',
        'loop_insight_id', new.loop_insight_id,
        'comment_key', new.comment_key,
        'disposition', new.status
      )
    from public.documents document
    where document.project_id = new.project_id
    returning id into new.feedback_comment_id;
  else
    update public.comments
    set
      body = v_body,
      anchor = jsonb_build_object(
        'kind', 'critique_review',
        'loop_insight_id', new.loop_insight_id,
        'comment_key', new.comment_key,
        'disposition', new.status
      ),
      updated_at = now()
    where id = new.feedback_comment_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_critique_review_comment() from public;

create trigger critique_reviews_sync_feedback_comment
before insert or update of status, response, reviewed_by
on public.critique_reviews
for each row execute function private.sync_critique_review_comment();

create trigger critique_reviews_touch_updated_at
before update on public.critique_reviews
for each row execute function private.touch_updated_at();

alter table public.critique_reviews enable row level security;

create policy critique_reviews_select_member
on public.critique_reviews
for select to authenticated
using (private.is_project_member(project_id));

create policy critique_reviews_insert_member
on public.critique_reviews
for insert to authenticated
with check (
  private.is_project_member(project_id)
  and reviewed_by = (select auth.uid())
);

create policy critique_reviews_update_member
on public.critique_reviews
for update to authenticated
using (private.is_project_member(project_id))
with check (
  private.is_project_member(project_id)
  and reviewed_by = (select auth.uid())
);

create policy critique_reviews_delete_reviewer
on public.critique_reviews
for delete to authenticated
using (
  reviewed_by = (select auth.uid())
  or private.is_project_owner(project_id)
);

grant select, insert, update, delete
  on public.critique_reviews to authenticated;

-- Extend the existing scheduled completion transaction without weakening the
-- secret check or duplicating the established Loop persistence path.
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
    decision_alerts = coalesce(p_result -> 'decisionAlerts', '[]'::jsonb),
    critique_comments = coalesce(p_result -> 'critiqueComments', '[]'::jsonb)
  where insight.loop_run_id = p_loop_id;
end;
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
