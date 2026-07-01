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
		profile = data as UserProfile | null;
	}

	return {
		session: locals.session,
		user: locals.user,
		profile
	};
};
