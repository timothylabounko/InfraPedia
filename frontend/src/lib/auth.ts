import { createClient } from '$lib/supabase/client';

const supabase = createClient();

export async function signInWithGoogle() {
	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${window.location.origin}/auth/callback`
		}
	});

	if (error) {
		throw error;
	}
}

export async function signOut() {
	await supabase.auth.signOut();
	window.location.href = '/';
}
