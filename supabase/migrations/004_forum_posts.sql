-- Forum posts + Reddit-style votes (run this file first in Supabase SQL editor)

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  user_id uuid not null references public.users (id) on delete cascade,
  title text,
  body text not null,
  rating int check (rating is null or (rating >= 1 and rating <= 5)),
  created_at timestamptz not null default now()
);

create index if not exists idx_forum_posts_subject on public.forum_posts (subject_slug, created_at desc);

alter table public.forum_posts enable row level security;

drop policy if exists "Anyone can read forum posts" on public.forum_posts;
create policy "Anyone can read forum posts"
  on public.forum_posts for select
  using (true);

drop policy if exists "Users insert own forum posts" on public.forum_posts;
create policy "Users insert own forum posts"
  on public.forum_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own forum posts" on public.forum_posts;
create policy "Users delete own forum posts"
  on public.forum_posts for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.forum_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_forum_votes_post on public.forum_votes (post_id);

alter table public.forum_votes enable row level security;

drop policy if exists "Anyone can read forum votes" on public.forum_votes;
create policy "Anyone can read forum votes"
  on public.forum_votes for select
  using (true);

drop policy if exists "Users manage own forum votes" on public.forum_votes;
create policy "Users manage own forum votes"
  on public.forum_votes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
