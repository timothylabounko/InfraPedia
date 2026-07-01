import type { LayoutServerLoad } from './$types';
import type { UserProfile } from '$lib/types/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	let profile: UserProfile | null = null;

	if (locals.user) {
		const { data } = await locals.supabase
			.from('users')
			.select('id, username, email')
			.eq('id', locals.user.id)
			.single();

		if (data) {
			profile = {
				...data,
				display_icon: (locals.user.user_metadata?.display_icon as string | undefined) ?? null,
				avatar_color: (locals.user.user_metadata?.avatar_color as string | undefined) ?? null,
				avatar_url: (locals.user.user_metadata?.avatar_url as string | undefined) ?? null
			};
		}
	}

	return {
		session: locals.session,
		user: locals.user,
		profile
	};
};
