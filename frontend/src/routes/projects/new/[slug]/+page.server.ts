import { createMetroMapProject } from '$lib/server/create-metro-project';
import { createTemplateProject } from '$lib/server/create-template-project';
import { isMapTemplateSlug } from '$lib/data/template-registry';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	if (!isMapTemplateSlug(params.slug)) {
		redirect(303, '/');
	}

	const title = url.searchParams.get('title') ?? '';
	if (!title.trim()) {
		redirect(303, `/templates/${params.slug}`);
	}

	if (params.slug === 'metro-map') {
		const mapSource = url.searchParams.get('map_source') === 'scratch' ? 'scratch' : 'osm';
		const result = await createMetroMapProject(locals.user, title, mapSource);
		if ('error' in result) error(500, result.error);
		redirect(303, `/projects/${result.id}`);
	}

	const result = await createTemplateProject(locals.user, params.slug, title);
	if ('error' in result) error(500, result.error);
	redirect(303, `/projects/${result.id}/map`);
};
