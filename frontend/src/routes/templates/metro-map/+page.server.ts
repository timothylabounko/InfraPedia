import { createMetroMapProject } from '$lib/server/create-metro-project';
import { metroMapTemplateImages } from '$lib/data/planning-projects';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const SUBJECT_SLUG = 'metro-map';

export const load: PageServerLoad = async () => {
	return {
		title: 'Metro Map Creator',
		description:
			'Start from this Delhi schematic metro map example. Draw your own lines on OpenStreetMap, then simplify them into a clean diagram with 45° and 90° angles — by hand or with the AI assistant.',
		images: metroMapTemplateImages,
		slug: SUBJECT_SLUG,
		forumHref: '/forum/metro-map'
	};
};

export const actions: Actions = {
	create: async ({ locals, request, url }) => {
		if (!locals.user) {
			redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';
		const mapSourceRaw = formData.get('map_source')?.toString() ?? 'osm';
		const mapSource = mapSourceRaw === 'scratch' ? 'scratch' : 'osm';

		const result = await createMetroMapProject(locals.user, title, mapSource);

		if ('error' in result) {
			return fail(400, { error: result.error, title, mapSource });
		}

		redirect(303, `/projects/${result.id}`);
	}
};
