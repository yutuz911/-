create table if not exists public.generation_jobs (
  id uuid primary key,
  mbti text not null,
  style text not null,
  aspect_ratio text not null,
  provider text not null,
  model text not null,
  status text not null default 'started',
  audit_status text not null,
  prompt_sha256 text not null,
  prompt text,
  stored_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.generation_jobs enable row level security;

drop policy if exists "service role manages generation jobs" on public.generation_jobs;
create policy "service role manages generation jobs"
on public.generation_jobs
for all
to service_role
using (true)
with check (true);

create index if not exists generation_jobs_created_at_idx
on public.generation_jobs (created_at desc);
