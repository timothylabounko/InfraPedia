import type { User } from '@supabase/supabase-js';
import { getTemplateConfig, type MapTemplateSlug } from '$lib/data/template-registry';
	import type { Json } from '$lib/supabase/database.types';
	import { createAdminClient } from '$lib/server/admin';
import { ensureMapTemplateTypes } from '$lib/server/ensure-templates';
import { getSiteOwner } from '$lib/server/site-user';

type CreateResult = { id: string } | { error: string };

export async function createTemplateProject(
	actingUser: User,
	slug: MapTemplateSlug,
	title: string,
	extraState: Record<string, unknown> = {}
): Promise<CreateResult> {
	if (slug === 'metro-map') {
		return { error: 'Use createMetroMapProject for metro-map templates.' };
	}

	const config = getTemplateConfig(slug);
	if (!config) {
		return { error: 'Unknown template.' };
	}

	const trimmedTitle = title.trim();
	if (!trimmedTitle) {
		return { error: 'Please enter a project title.' };
	}

	const siteOwner = await getSiteOwner();
	if (!siteOwner) {
		return {
			error: 'tim.labounko@gmail.com must sign in once before projects can be created.'
		};
	}

	await ensureMapTemplateTypes();
	const admin = createAdminClient();

	const { data: projectType, error: typeError } = await admin
		.from('project_types')
		.select('id, name, slug, metadata')
		.eq('slug', slug)
		.single();

	if (typeError || !projectType) {
		return { error: `${config.title} is not available. Please try again in a moment.` };
	}

	const { data: project, error: projectError } = await admin
		.from('projects')
		.insert({
			name: trimmedTitle,
			description: `${config.title} by ${siteOwner.email}`,
			owner_id: siteOwner.id,
			project_type_id: projectType.id,
			visibility: 'private',
			status: 'draft'
		})
		.select('id')
		.single();

	if (projectError || !project) {
		return { error: projectError?.message ?? 'Could not create project.' };
	}

	const members = [
		{ project_id: project.id, user_id: siteOwner.id, role: 'owner' as const },
		...(actingUser.id !== siteOwner.id
			? [{ project_id: project.id, user_id: actingUser.id, role: 'editor' as const }]
			: [])
	];

	const { error: memberError } = await admin.from('project_members').upsert(members, {
		onConflict: 'project_id,user_id'
	});

	if (memberError) {
		console.error('project_members upsert:', memberError.message);
	}

	const metadata = (projectType.metadata ?? {}) as Record<string, unknown>;
	const mapState = {
		...config.defaultMapState,
		center: metadata.default_center ?? config.defaultMapState.center,
		zoom: metadata.default_zoom ?? config.defaultMapState.zoom,
		...extraState
	};

	const { error: mapError } = await admin.from('project_data').insert({
		project_id: project.id,
		key: 'map_state',
		value: mapState as Json
	});

	if (mapError) {
		return { error: mapError.message };
	}

	return { id: project.id };
}
