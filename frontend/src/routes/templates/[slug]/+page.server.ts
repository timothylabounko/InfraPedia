import { createTemplateProject } from '$lib/server/create-template-project';
import { getTemplateConfig, isMapTemplateSlug } from '$lib/data/template-registry';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (params.slug === 'metro-map') {
		redirect(303, '/templates/metro-map');
	}

	const config = getTemplateConfig(params.slug);
	if (!config) {
		error(404, 'Template not found');
	}

	return {
		slug: config.slug,
		title: config.title,
		description: config.description,
		creatorName: config.creatorName,
		images: config.images,
		forumHref: config.forumHref,
		instructions: config.instructions,
		createButtonLabel: config.createButtonLabel
	};
};

export const actions: Actions = {
	create: async ({ locals, request, url, params }) => {
		if (!locals.user) {
			redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
		}

		if (!isMapTemplateSlug(params.slug) || params.slug === 'metro-map') {
			return fail(400, { error: 'Unknown template.' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';
		const result = await createTemplateProject(locals.user, params.slug, title);

		if ('error' in result) {
			return fail(400, { error: result.error, title });
		}

		redirect(303, `/projects/${result.id}`);
	}
};
