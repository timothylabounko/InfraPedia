-- InfraPedia initial schema (Postgres + PostGIS)
-- Run this in Supabase Dashboard → SQL Editor

create extension if not exists postgis;

-- ============================================================
-- Profiles (linked to Supabase Auth)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username varchar,
  email varchar unique not null,
  password_hash varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================
-- Project types
-- ============================================================
create table public.project_types (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  slug varchar unique not null,
  description text,
  icon varchar,
  template_version varchar,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Projects
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  project_type_id uuid not null references public.project_types (id),
  name varchar not null,
  description text,
  visibility varchar not null default 'private'
    check (visibility in ('private', 'team', 'public')),
  status varchar not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- Project members
-- ============================================================
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role varchar not null default 'viewer'
    check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ============================================================
-- Project sessions
-- ============================================================
create table public.project_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_activity timestamptz not null default now()
);

-- ============================================================
-- Comments
-- ============================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Project layers
-- ============================================================
create table public.project_layers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name varchar not null,
  layer_type varchar not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Project files
-- ============================================================
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  layer_id uuid references public.project_layers (id) on delete set null,
  filename varchar not null,
  original_filename varchar not null,
  file_type varchar,
  mime_type varchar,
  storage_path varchar not null,
  size bigint,
  uploaded_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Project data
-- ============================================================
create table public.project_data (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  key varchar not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

create trigger project_data_set_updated_at
  before update on public.project_data
  for each row execute function public.set_updated_at();

-- ============================================================
-- Agents
-- ============================================================
create table public.agent_definitions (
  id uuid primary key default gen_random_uuid(),
  project_type_id uuid not null references public.project_types (id) on delete cascade,
  name varchar not null,
  description text,
  version varchar not null,
  configuration jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.project_agents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agent_definition_id uuid not null references public.agent_definitions (id),
  configuration jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Project versions
-- ============================================================
create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_number int not null,
  snapshot jsonb not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_projects_owner on public.projects (owner_id);
create index idx_project_members_user on public.project_members (user_id);
create index idx_comments_project on public.comments (project_id);
create index idx_project_files_project on public.project_files (project_id);
create index idx_project_data_project on public.project_data (project_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users enable row level security;
alter table public.project_types enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_sessions enable row level security;
alter table public.comments enable row level security;
alter table public.project_layers enable row level security;
alter table public.project_files enable row level security;
alter table public.project_data enable row level security;
alter table public.agent_definitions enable row level security;
alter table public.project_agents enable row level security;
alter table public.project_versions enable row level security;

create policy "Users read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.users for update
  using (auth.uid() = id);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  );
$$;

create policy "Read projects you own or belong to"
  on public.projects for select
  using (owner_id = auth.uid() or public.is_project_member(id));

create policy "Owners insert projects"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "Owners update projects"
  on public.projects for update
  using (owner_id = auth.uid());

create policy "Owners delete projects"
  on public.projects for delete
  using (owner_id = auth.uid());

create policy "Authenticated read project types"
  on public.project_types for select
  to authenticated
  using (true);

create policy "Authenticated read agent definitions"
  on public.agent_definitions for select
  to authenticated
  using (true);

create policy "Members read project members"
  on public.project_members for select
  using (public.is_project_member(project_id));

create policy "Owners manage project members"
  on public.project_members for all
  using (
    exists (
      select 1 from public.projects
      where id = project_id and owner_id = auth.uid()
    )
  );

create policy "Members read comments"
  on public.comments for select
  using (public.is_project_member(project_id));

create policy "Members insert comments"
  on public.comments for insert
  with check (public.is_project_member(project_id) and user_id = auth.uid());

create policy "Members read layers"
  on public.project_layers for select
  using (public.is_project_member(project_id));

create policy "Editors manage layers"
  on public.project_layers for all
  using (public.is_project_member(project_id));

create policy "Members read files"
  on public.project_files for select
  using (public.is_project_member(project_id));

create policy "Members upload files"
  on public.project_files for insert
  with check (public.is_project_member(project_id) and uploaded_by = auth.uid());

create policy "Members read project data"
  on public.project_data for select
  using (public.is_project_member(project_id));

create policy "Members manage project data"
  on public.project_data for all
  using (public.is_project_member(project_id));

create policy "Members read project agents"
  on public.project_agents for select
  using (public.is_project_member(project_id));

create policy "Members manage project agents"
  on public.project_agents for all
  using (public.is_project_member(project_id));

create policy "Members read project versions"
  on public.project_versions for select
  using (public.is_project_member(project_id));

create policy "Members create project versions"
  on public.project_versions for insert
  with check (public.is_project_member(project_id) and created_by = auth.uid());

create policy "Members read project sessions"
  on public.project_sessions for select
  using (public.is_project_member(project_id));

create policy "Users manage own sessions"
  on public.project_sessions for all
  using (user_id = auth.uid());

-- Seed a default project type
insert into public.project_types (name, slug, description, icon)
values ('Infrastructure Map', 'infra-map', 'Default infrastructure mapping project', 'map');
