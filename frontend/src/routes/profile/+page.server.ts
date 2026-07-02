import { error, fail, redirect } from '@sveltejs/kit';
import { AVATAR_BUCKET, avatarColorOptions, avatarIconOptions } from '$lib/utils/avatar';
import type { Actions, PageServerLoad } from './$types';
import type { UserProfile } from '$lib/types/auth';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	const { data, error: profileError } = await locals.supabase
		.from('users')
		.select('id, username, email')
		.eq('id', locals.user.id)
		.single();

	if (profileError) {
		error(500, profileError.message);
	}

	const profile: UserProfile = {
		...data,
		display_icon: (locals.user.user_metadata?.display_icon as string | undefined) ?? null,
		avatar_color: (locals.user.user_metadata?.avatar_color as string | undefined) ?? null,
		avatar_url: (locals.user.user_metadata?.avatar_url as string | undefined) ?? null
	};

	return {
		profile,
		iconOptions: avatarIconOptions,
		colorOptions: avatarColorOptions
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in required' });
		}

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const displayIcon = String(form.get('display_icon') ?? '').trim();
		const avatarColor = String(form.get('avatar_color') ?? '').trim();
		const removeAvatar = form.get('remove_avatar') === 'on';
		const avatarFile = form.get('avatar');

		if (!username) {
			return fail(400, { error: 'Username is required' });
		}

		let avatarUrl =
			(locals.user.user_metadata?.avatar_url as string | undefined) ?? null;

		if (removeAvatar) {
			if (avatarUrl) {
				const path = `${locals.user.id}/avatar`;
				await locals.supabase.storage.from(AVATAR_BUCKET).remove([path]);
			}
			avatarUrl = null;
		} else if (avatarFile instanceof File && avatarFile.size > 0) {
			if (!avatarFile.type.startsWith('image/')) {
				return fail(400, { error: 'Please upload an image file.' });
			}

			if (avatarFile.size > MAX_AVATAR_BYTES) {
				return fail(400, { error: 'Image must be 2 MB or smaller.' });
			}

			const path = `${locals.user.id}/avatar`;
			const fileBuffer = new Uint8Array(await avatarFile.arrayBuffer());

			const { error: uploadError } = await locals.supabase.storage
				.from(AVATAR_BUCKET)
				.upload(path, fileBuffer, {
					upsert: true,
					contentType: avatarFile.type
				});

			if (uploadError) {
				return fail(
					500,
					uploadError.message.includes('Bucket not found')
						? 'Avatar storage is not set up yet. Run supabase/migrations/002_avatars_storage.sql in Supabase.'
						: uploadError.message
				);
			}

			const { data: publicUrl } = locals.supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
			avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
		}

		const { error: updateUserError } = await locals.supabase
			.from('users')
			.update({ username })
			.eq('id', locals.user.id);

		if (updateUserError) {
			return fail(500, { error: updateUserError.message });
		}

		const { error: authError } = await locals.supabase.auth.updateUser({
			data: {
				display_icon: displayIcon || null,
				avatar_color: avatarColor || null,
				avatar_url: avatarUrl,
				full_name: username
			}
		});

		if (authError) {
			return fail(500, { error: authError.message });
		}

		await locals.supabase.auth.refreshSession();

		return { success: true };
	}
};
