-- Four additional map templates + seed projects owned by tim.labounko@gmail.com
-- Run after 003_metro_map.sql

insert into public.project_types (name, slug, description, icon, template_version, metadata)
values
  (
    'Transit Propensity Analyzer',
    'transit-propensity',
    'Draw a transit corridor, place stations, and score census tracts by transit propensity.',
    'transit',
    '1.0.0',
    '{"default_center": [39.8283, -98.5795], "default_zoom": 4, "requires_backend": true, "backend_port": 8001}'::jsonb
  ),
  (
    'Bikeability Analyzer',
    'bikeability',
    'Score city street networks for bike safety using OSM data, crash records, and bike lane coverage.',
    'bike',
    '1.0.0',
    '{"default_center": [36.7783, -119.4179], "default_zoom": 6, "requires_backend": true, "backend_port": 8002}'::jsonb
  ),
  (
    'Pedestrian Intersection Counter',
    'micromobility-light',
    'Count pedestrians at intersections, simulate crossing movements, and visualize walkable networks.',
    'pedestrian',
    '1.0.0',
    '{"default_center": [40.758, -73.9855], "default_zoom": 14}'::jsonb
  ),
  (
    'Food Journey Map Tracker',
    'food-journey',
    'Track and rate food spots on a map with filters, notes, photos, and custom places.',
    'food',
    '1.0.0',
    '{"default_center": [1.3521, 103.8198], "default_zoom": 12}'::jsonb
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  template_version = excluded.template_version,
  metadata = excluded.metadata;

-- Seed showcase template projects owned by tim.labounko@gmail.com
do $$
declare
  site_owner_id uuid;
  pt record;
  new_project_id uuid;
  default_states jsonb := '{
    "transit-propensity": {"center": [39.8283, -98.5795], "zoom": 4, "corridor": null, "stations": [], "layerVisibility": {}, "ioInputs": null, "ioOutputs": null},
    "bikeability": {"center": [36.7783, -119.4179], "zoom": 6, "city": "", "weights": null, "accidentYear": null, "streetNetwork": null},
    "micromobility-light": {"center": [40.758, -73.9855], "zoom": 14, "phase": "choosing_type", "intersectionMode": null, "analysis": null, "approachCounts": {}, "crosswalkSignal": null},
    "food-journey": {"center": [1.3521, 103.8198], "zoom": 12, "places": [], "ratings": {}, "filterFood": ""}
  }'::jsonb;
begin
  select id into site_owner_id
  from public.users
  where lower(email) = lower('tim.labounko@gmail.com')
  limit 1;

  if site_owner_id is null then
    raise notice 'User tim.labounko@gmail.com not found — sign in once, then re-run this migration block.';
    return;
  end if;

  for pt in
    select id, slug, name
    from public.project_types
    where slug in ('transit-propensity', 'bikeability', 'micromobility-light', 'food-journey')
  loop
    if exists (
      select 1
      from public.projects p
      where p.owner_id = site_owner_id
        and p.project_type_id = pt.id
        and p.name = pt.name || ' Template'
    ) then
      continue;
    end if;

    insert into public.projects (name, description, owner_id, project_type_id, visibility, status)
    values (
      pt.name || ' Template',
      'Official template showcase for ' || pt.name || '.',
      site_owner_id,
      pt.id,
      'public',
      'active'
    )
    returning id into new_project_id;

    insert into public.project_members (project_id, user_id, role)
    values (new_project_id, site_owner_id, 'owner')
    on conflict (project_id, user_id) do nothing;

    insert into public.project_data (project_id, key, value)
    values (
      new_project_id,
      'map_state',
      coalesce(default_states -> pt.slug, '{}'::jsonb)
    )
    on conflict (project_id, key) do nothing;
  end loop;
end $$;
