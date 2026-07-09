-- User-created forum subjects
create table if not exists public.forum_subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_forum_subjects_slug on public.forum_subjects (slug);

alter table public.forum_subjects enable row level security;

drop policy if exists "Anyone can read forum subjects" on public.forum_subjects;
create policy "Anyone can read forum subjects"
  on public.forum_subjects for select
  using (true);

drop policy if exists "Authenticated users create forum subjects" on public.forum_subjects;
create policy "Authenticated users create forum subjects"
  on public.forum_subjects for insert
  to authenticated
  with check (auth.uid() = created_by);
