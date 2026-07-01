import { createClient } from '$lib/supabase/client';

const supabase = createClient();

export async function signInWithGoogle(nextPath?: string) {
	const redirectTo = nextPath
		? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
		: `${window.location.origin}/auth/callback`;

	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo }
	});

	if (error) {
		throw error;
	}
}

export async function signOut() {
	await supabase.auth.signOut();
	window.location.href = '/';
}
