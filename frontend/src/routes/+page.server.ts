import { getProjectThumbnail } from '$lib/data/planning-projects';
import { createActions } from '$lib/data/create-actions';
import { planningProjectLibrary } from '$lib/data/planning-projects';
import { SITE_OWNER_EMAIL } from '$lib/server/site-user';
import type { LibraryProject } from '$lib/types/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	let projects: LibraryProject[] = [];

	if (locals.user) {
		type ProjectRow = {
			id: string;
			name: string;
			description: string | null;
			visibility: string;
			owner_id: string;
			project_types: { name: string; slug: string } | null;
		};

		const { data: published } = await locals.supabase
			.from('projects')
			.select('id, name, description, visibility, owner_id, project_types(name, slug)')
			.eq('status', 'active')
			.order('updated_at', { ascending: false });

		const rows = (published ?? []) as ProjectRow[];
		const ids = rows.map((p) => p.id);

		const previewByProject: Record<string, string[]> = {};
		if (ids.length > 0) {
			const { data: previews } = await locals.supabase
				.from('project_data')
				.select('project_id, value')
				.in('project_id', ids)
				.eq('key', 'preview_images');

			for (const row of (previews ?? []) as { project_id: string; value: unknown }[]) {
				const val = row.value as { images?: string[] } | string[] | null;
				if (Array.isArray(val)) previewByProject[row.project_id] = val;
				else if (val && typeof val === 'object' && Array.isArray(val.images)) {
					previewByProject[row.project_id] = val.images;
				}
			}
		}

		projects = rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			visibility: row.visibility,
			isOwner: row.owner_id === locals.user!.id,
			project_types: row.project_types,
			creatorEmail: SITE_OWNER_EMAIL,
			creatorName: SITE_OWNER_EMAIL,
			images: getProjectThumbnail(row.project_types?.slug, previewByProject[row.id])
		}));
	}

	return {
		templates: planningProjectLibrary,
		projects,
		createActions
	};
};
