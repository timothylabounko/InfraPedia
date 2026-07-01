import { createClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createClient(event.cookies);

	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();

	event.locals.session = user ? (await event.locals.supabase.auth.getSession()).data.session : null;
	event.locals.user = user ?? null;

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
