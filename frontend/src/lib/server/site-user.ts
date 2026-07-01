import { createAdminClient } from '$lib/server/admin';

export const SITE_OWNER_EMAIL = 'tim.labounko@gmail.com';

export type SiteOwner = {
	id: string;
	email: string;
	username: string | null;
};

export async function getSiteOwner(): Promise<SiteOwner | null> {
	const admin = createAdminClient();

	const { data: profile } = await admin
		.from('users')
		.select('id, email, username')
		.eq('email', SITE_OWNER_EMAIL)
		.maybeSingle();

	if (profile) {
		return profile;
	}

	const { data: authData, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
	if (error) {
		console.error('getSiteOwner listUsers:', error.message);
		return null;
	}

	const authUser = authData.users.find(
		(u) => u.email?.toLowerCase() === SITE_OWNER_EMAIL.toLowerCase()
	);

	if (!authUser?.email) return null;

	const username =
		(authUser.user_metadata?.full_name as string | undefined) ??
		authUser.email.split('@')[0];

	await admin.from('users').upsert(
		{ id: authUser.id, email: authUser.email, username },
		{ onConflict: 'id' }
	);

	return { id: authUser.id, email: authUser.email, username };
}
