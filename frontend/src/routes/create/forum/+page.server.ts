import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to create a forum.' });
		}

		const formData = await request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const description = String(formData.get('description') ?? '').trim();

		if (!title) {
			return fail(400, { error: 'Title is required.', title });
		}

		const slug = slugify(title);
		if (!slug) {
			return fail(400, { error: 'Could not generate a valid forum slug.', title });
		}

		const { error: insertError } = await locals.supabase.from('forum_subjects').insert({
			slug,
			title,
			description: description || null,
			created_by: locals.user.id
		});

		if (insertError) {
			if (insertError.code === '42P01') {
				return fail(500, {
					error: 'Forum subjects table is missing. Run supabase/migrations/007_forum_subjects.sql.',
					title
				});
			}
			if (insertError.code === '23505') {
				return fail(400, { error: 'A forum with this name already exists.', title });
			}
			return fail(500, { error: insertError.message, title });
		}

		redirect(303, `/forum/${slug}`);
	}
};
