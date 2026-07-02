-- Optional follow-up if you already ran an older 004 without title/votes.
-- Safe to run after 004_forum_posts.sql (no-op if everything exists).

alter table public.forum_posts
  add column if not exists title text;

update public.forum_posts
set title = left(body, 120)
where title is null or title = '';

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
