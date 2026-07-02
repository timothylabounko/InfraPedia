import { fail, error } from '@sveltejs/kit';
import { createForumPost, loadForumFeed, voteForumPost } from '$lib/server/forum';
import { planningProjectLibrary } from '$lib/data/planning-projects';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const template = planningProjectLibrary.find((t) => t.slug === params.slug);
	if (!template) {
		error(404, 'Forum not found');
	}

	const feed = await loadForumFeed(locals.supabase, params.slug, locals.user?.id ?? null);

	return {
		template,
		feed,
		subjectSlug: params.slug
	};
};

export const actions: Actions = {
	createPost: async ({ locals, request, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to post.' });
		}

		const form = await request.formData();
		const title = String(form.get('title') ?? '');
		const body = String(form.get('body') ?? '');
		const ratingRaw = String(form.get('rating') ?? '').trim();
		const rating = ratingRaw ? Number(ratingRaw) : null;

		const result = await createForumPost(
			locals.supabase,
			locals.user.id,
			params.slug,
			title,
			body,
			Number.isFinite(rating) ? rating : null
		);

		if (result.error) {
			return fail(400, { error: result.error });
		}

		return { success: true };
	},

	vote: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to vote.' });
		}

		const form = await request.formData();
		const postId = String(form.get('post_id') ?? '');
		const value = Number(form.get('value'));

		if (!postId) return fail(400, { error: 'Missing post.' });
		if (![1, -1, 0].includes(value)) return fail(400, { error: 'Invalid vote.' });

		const result = await voteForumPost(
			locals.supabase,
			locals.user.id,
			postId,
			value as -1 | 0 | 1
		);

		if (result.error) {
			return fail(400, { error: result.error });
		}

		return { voted: true };
	}
};
