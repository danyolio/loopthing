-- Keep scheduled Dreams as inspectable as manual Loops. These secret-gated
-- functions let the cron launcher attach the durable Workflow run and let the
-- synthesis step record the provider/model even when generation later fails.

create or replace function private.record_scheduled_loop_workflow(
  p_secret text,
  p_loop_id uuid,
  p_workflow_run_id text
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

  if nullif(trim(p_workflow_run_id), '') is null then
    raise exception 'Workflow run id is required';
  end if;

  update public.loop_runs
  set workflow_run_id = p_workflow_run_id
  where id = p_loop_id;

  if not found then raise exception 'Loop not found'; end if;
end;
$$;

create or replace function public.record_scheduled_loop_workflow(
  p_secret text,
  p_loop_id uuid,
  p_workflow_run_id text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.record_scheduled_loop_workflow(
    p_secret,
    p_loop_id,
    p_workflow_run_id
  );
$$;

create or replace function private.record_scheduled_loop_runtime(
  p_secret text,
  p_loop_id uuid,
  p_provider text,
  p_model text
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

  if p_provider not in ('google', 'openai') then
    raise exception 'Unsupported provider';
  end if;

  if nullif(trim(p_model), '') is null then
    raise exception 'Model is required';
  end if;

  update public.loop_runs
  set provider = p_provider, model = p_model
  where id = p_loop_id;

  if not found then raise exception 'Loop not found'; end if;
end;
$$;

create or replace function public.record_scheduled_loop_runtime(
  p_secret text,
  p_loop_id uuid,
  p_provider text,
  p_model text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.record_scheduled_loop_runtime(
    p_secret,
    p_loop_id,
    p_provider,
    p_model
  );
$$;

revoke all on function private.record_scheduled_loop_workflow(text, uuid, text)
  from public, anon, authenticated;
grant execute on function private.record_scheduled_loop_workflow(text, uuid, text)
  to anon;
revoke all on function public.record_scheduled_loop_workflow(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_scheduled_loop_workflow(text, uuid, text)
  to anon;

revoke all on function private.record_scheduled_loop_runtime(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.record_scheduled_loop_runtime(text, uuid, text, text)
  to anon;
revoke all on function public.record_scheduled_loop_runtime(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_scheduled_loop_runtime(text, uuid, text, text)
  to anon;
