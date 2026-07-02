import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Json } from '$lib/supabase/database.types';
import { DEFAULT_LEGEND, type MapLegendSettings, type ProjectMapState, type SharingSettings } from '$lib/metro/types';
import { emptyMetroGeoJSON, emptyStationsGeoJSON, emptyPolygonsGeoJSON } from '$lib/metro/simplify';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	const { data: project, error: projectError } = await locals.supabase
		.from('projects')
		.select('id, name, description, owner_id, visibility, status, project_types(slug, name, metadata)')
		.eq('id', params.id)
		.single();

	if (projectError || !project) {
		error(404, 'Project not found');
	}

	const row = project as {
		id: string;
		name: string;
		description: string | null;
		owner_id: string;
		visibility: string;
		status: string;
		project_types: { slug: string; name: string; metadata: Json } | null;
	};

	const slug = row.project_types?.slug;
	if (slug !== 'metro-map') {
		error(404, 'This editor is only available for Metro Map projects');
	}

	const isOwner = row.owner_id === locals.user.id;
	const { data: membership } = await locals.supabase
		.from('project_members')
		.select('role')
		.eq('project_id', row.id)
		.eq('user_id', locals.user.id)
		.maybeSingle();

	if (!isOwner && !membership) {
		error(403, 'Access denied');
	}

	const { data: mapData } = await locals.supabase
		.from('project_data')
		.select('value')
		.eq('project_id', row.id)
		.eq('key', 'map_state')
		.maybeSingle();

	const metadata = row.project_types?.metadata as {
		default_center?: [number, number];
		default_zoom?: number;
	};

	const defaultState: ProjectMapState = {
		viewMode: 'geographic',
		mapSource: 'osm',
		lines: emptyMetroGeoJSON(),
		simplifiedLines: null,
		stations: emptyStationsGeoJSON(),
		polygons: emptyPolygonsGeoJSON(),
		landcover: null,
		legend: DEFAULT_LEGEND,
		center: metadata?.default_center ?? [77.209, 28.6139],
		zoom: metadata?.default_zoom ?? 11
	};

	const rawState = (mapData?.value as ProjectMapState | undefined) ?? defaultState;
	const mapState: ProjectMapState = {
		...defaultState,
		...rawState,
		mapSource: rawState.mapSource ?? 'osm',
		stations: rawState.stations ?? emptyStationsGeoJSON(),
		polygons: rawState.polygons ?? emptyPolygonsGeoJSON(),
		landcover: rawState.landcover ?? null,
		legend: rawState.legend ?? DEFAULT_LEGEND
	};

	const { data: sharingData } = await locals.supabase
		.from('project_data')
		.select('value')
		.eq('project_id', row.id)
		.eq('key', 'sharing_settings')
		.maybeSingle();

	const defaultSharing: SharingSettings = {
		mode:
			row.visibility === 'public'
				? 'public'
				: row.visibility === 'team'
					? 'collaborators'
					: 'private',
		collaboratorEmails: [],
		requireApproval: true
	};

	const sharing = (sharingData?.value as SharingSettings | undefined) ?? defaultSharing;

	const { data: chatHistory, error: chatError } = await locals.supabase
		.from('chat_messages')
		.select('id, role, content, tool_calls, created_at')
		.eq('project_id', row.id)
		.order('created_at', { ascending: true })
		.limit(50);

	if (chatError) {
		console.warn('chat_messages load:', chatError.message);
	}

	return {
		project: {
			id: row.id,
			name: row.name,
			description: row.description,
			visibility: row.visibility,
			status: row.status,
			isOwner
		},
		mapState,
		sharing,
		chatHistory: chatHistory ?? []
	};
};
