create function private.update_scheduled_loop(
  p_secret text,
  p_loop_id uuid,
  p_status public.loop_status,
  p_stage text,
  p_percent integer,
  p_error text default null
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

  update public.loop_runs
  set
    status = p_status,
    progress_stage = p_stage,
    progress_percent = greatest(0, least(100, p_percent)),
    started_at = case
      when p_status <> 'queued' and started_at is null then now()
      else started_at
    end,
    completed_at = case
      when p_status = 'failed' then now()
      else completed_at
    end,
    error_message = p_error
  where id = p_loop_id;

  if not found then raise exception 'Loop not found'; end if;
end;
$$;

create function public.update_scheduled_loop(
  p_secret text,
  p_loop_id uuid,
  p_status public.loop_status,
  p_stage text,
  p_percent integer,
  p_error text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.update_scheduled_loop(
    p_secret,
    p_loop_id,
    p_status,
    p_stage,
    p_percent,
    p_error
  );
$$;

revoke all on function private.update_scheduled_loop(text, uuid, public.loop_status, text, integer, text)
  from public, anon, authenticated;
grant execute on function private.update_scheduled_loop(text, uuid, public.loop_status, text, integer, text)
  to anon;
revoke all on function public.update_scheduled_loop(text, uuid, public.loop_status, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.update_scheduled_loop(text, uuid, public.loop_status, text, integer, text)
  to anon;
