import { getProjectThumbnail, communityForumPosts, createColumnActions } from '$lib/data/planning-projects';
import { planningProjectLibrary } from '$lib/data/planning-projects';import type { LibraryProject } from '$lib/types/library';
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
		const ownerIds = [...new Set(rows.map((p) => p.owner_id))];

		const ownerById: Record<string, { username: string | null; email: string }> = {};
		if (ownerIds.length > 0) {
			const { data: owners } = await locals.supabase
				.from('users')
				.select('id, username, email')
				.in('id', ownerIds);

			for (const owner of owners ?? []) {
				ownerById[owner.id] = { username: owner.username, email: owner.email };
			}
		}

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

		projects = rows.map((row) => {
			const owner = ownerById[row.owner_id];
			const creatorName =
				owner?.username ?? owner?.email?.split('@')[0] ?? 'Unknown';
			return {
				id: row.id,
				name: row.name,
				description: row.description,
				visibility: row.visibility,
				isOwner: row.owner_id === locals.user!.id,
				project_types: row.project_types,
				creatorEmail: owner?.email ?? '',
				creatorName,
				images: getProjectThumbnail(row.project_types?.slug, previewByProject[row.id])
			};
		});
	}

	return {
		templates: planningProjectLibrary,
		projects,
		communityPosts: communityForumPosts,
		createActions: createColumnActions
	};
};
