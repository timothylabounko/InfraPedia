import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTemplateConfig, isMapTemplateSlug } from '$lib/data/template-registry';
import type { SharingSettings } from '$lib/metro/types';

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
		project_types: { slug: string; name: string; metadata: unknown } | null;
	};

	const slug = row.project_types?.slug;
	if (!isMapTemplateSlug(slug) || slug === 'metro-map') {
		redirect(303, `/projects/${params.id}`);
	}

	const config = getTemplateConfig(slug);
	if (!config) {
		error(404, 'Template not found');
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

	const metadata = (row.project_types?.metadata ?? {}) as {
		default_center?: [number, number];
		default_zoom?: number;
	};

	const defaultState = {
		...config.defaultMapState,
		center: metadata.default_center ?? config.defaultMapState.center,
		zoom: metadata.default_zoom ?? config.defaultMapState.zoom
	};

	const mapState = {
		...defaultState,
		...((mapData?.value as Record<string, unknown> | undefined) ?? {})
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

	const { data: apiConfigData } = await locals.supabase
		.from('project_data')
		.select('value')
		.eq('project_id', row.id)
		.eq('key', 'api_config')
		.maybeSingle();

	return {
		project: {
			id: row.id,
			name: row.name,
			description: row.description,
			visibility: row.visibility,
			status: row.status,
			isOwner
		},
		templateSlug: slug,
		embedPath: config.embedPath,
		mapState,
		sharing,
		apiConfig: (apiConfigData?.value as import('$lib/data/platform-apis').TemplateApiRequirement[] | undefined) ?? []
	};
};
