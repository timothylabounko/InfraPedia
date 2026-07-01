import { redirect } from '@sveltejs/kit';
import { getProjectThumbnail } from '$lib/data/planning-projects';
import type { PageServerLoad } from './$types';
import type { LibraryProject } from '$lib/types/library';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

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
		.eq('owner_id', locals.user.id)
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

		for (const row of previews ?? []) {
			const val = row.value as { images?: string[] } | string[] | null;
			if (Array.isArray(val)) previewByProject[row.project_id] = val;
			else if (val && typeof val === 'object' && Array.isArray(val.images)) {
				previewByProject[row.project_id] = val.images;
			}
		}
	}

	const projects: LibraryProject[] = rows.map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description,
		visibility: row.visibility,
		isOwner: true,
		project_types: row.project_types,
		creatorEmail: locals.user!.email ?? '',
		creatorName: locals.user!.email ?? 'You',
		images: getProjectThumbnail(row.project_types?.slug, previewByProject[row.id])
	}));

	return { projects };
};
