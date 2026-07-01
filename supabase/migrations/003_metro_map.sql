-- Metro Map creator: geometry, chat, seeds
-- Run after 001_initial_schema.sql

-- PostGIS geometry on layers (metro lines)
alter table public.project_layers
  add column if not exists geometry geometry(Geometry, 4326);

create index if not exists idx_project_layers_geometry
  on public.project_layers using gist (geometry);

-- Chat messages per project
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  role varchar not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_project
  on public.chat_messages (project_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Members read chat messages"
  on public.chat_messages for select
  using (public.is_project_member(project_id));

create policy "Members insert chat messages"
  on public.chat_messages for insert
  with check (public.is_project_member(project_id));

-- Metro Map project type
insert into public.project_types (name, slug, description, icon, template_version, metadata)
values (
  'Metro Map Creator',
  'metro-map',
  'Draw transit lines on OSM and simplify to schematic metro diagrams with AI assistance.',
  'metro',
  '1.0.0',
  '{"default_center": [-73.9855, 40.758], "default_zoom": 11}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  template_version = excluded.template_version,
  metadata = excluded.metadata;

-- Metro Map AI agent definition
insert into public.agent_definitions (
  project_type_id,
  name,
  description,
  version,
  configuration
)
select
  pt.id,
  'Metro Map Assistant',
  'Helps users draw lines, simplify maps to schematic metro style, and explains UI controls.',
  '1.0.0',
  '{
    "model": "claude-sonnet-4-20250514",
    "system_prompt": "You are the InfraPedia Metro Map Assistant. Help users draw transit lines on an OSM map and simplify them into clean schematic metro diagrams with 45 and 90 degree angles. You can press UI buttons on their behalf using tools. Always explain what you are doing briefly.",
    "tools": [
      "enable_draw_mode",
      "disable_draw_mode",
      "simplify_map",
      "set_view_mode",
      "clear_lines",
      "save_project"
    ]
  }'::jsonb
from public.project_types pt
where pt.slug = 'metro-map'
  and not exists (
    select 1 from public.agent_definitions ad
    where ad.project_type_id = pt.id and ad.name = 'Metro Map Assistant'
  );
