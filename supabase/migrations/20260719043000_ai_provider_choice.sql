alter table public.projects
  add column ai_provider text not null default 'google'
  check (ai_provider in ('google', 'openai'));

alter table public.loop_runs
  add column provider text not null default 'google'
  check (provider in ('google', 'openai')),
  add column model text;

create index loop_runs_provider_created_idx
  on public.loop_runs (provider, created_at desc);
