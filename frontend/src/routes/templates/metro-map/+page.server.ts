import { createMetroMapProject } from '$lib/server/create-metro-project';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ locals, request, url }) => {
		if (!locals.user) {
			redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';

		const result = await createMetroMapProject(locals.user, title);

		if ('error' in result) {
			return fail(400, { error: result.error, title });
		}

		redirect(303, `/projects/${result.id}`);
	}
};
