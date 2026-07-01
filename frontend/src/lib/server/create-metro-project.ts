import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '$lib/server/admin';
import { ensureMetroMapProjectType } from '$lib/server/ensure-metro';
import { getSiteOwner } from '$lib/server/site-user';

type CreateResult = { id: string } | { error: string };

export async function createMetroMapProject(
	actingUser: User,
	title: string
): Promise<CreateResult> {
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

	await ensureMetroMapProjectType();
	const admin = createAdminClient();

	const { data: projectType, error: typeError } = await admin
		.from('project_types')
		.select('id, name, slug, metadata')
		.eq('slug', 'metro-map')
		.single();

	if (typeError || !projectType) {
		return { error: 'Metro Map template is not available. Please try again in a moment.' };
	}

	const { data: project, error: projectError } = await admin
		.from('projects')
		.insert({
			name: trimmedTitle,
			description: `Metro map by ${siteOwner.email}`,
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

	const metadata = projectType.metadata as {
		default_center?: [number, number];
		default_zoom?: number;
	};

	const { error: mapError } = await admin.from('project_data').insert({
		project_id: project.id,
		key: 'map_state',
		value: {
			viewMode: 'geographic',
			mapSource: 'osm',
			lines: { type: 'FeatureCollection', features: [] },
			simplifiedLines: null,
			stations: { type: 'FeatureCollection', features: [] },
			polygons: { type: 'FeatureCollection', features: [] },
			landcover: null,
			legend: {
				title: 'Metro Map',
				items: [],
				showScaleBar: true,
				showNorthArrow: true,
				scaleUnit: 'km',
				position: 'bottom-left'
			},
			center: metadata?.default_center ?? [77.209, 28.6139],
			zoom: metadata?.default_zoom ?? 11
		}
	});

	if (mapError) {
		return { error: mapError.message };
	}

	return { id: project.id };
}
