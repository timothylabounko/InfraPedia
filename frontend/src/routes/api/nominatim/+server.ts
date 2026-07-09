import { TEMPLATE_API_BACKEND } from '$lib/server/template-api-backend';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const target = `${TEMPLATE_API_BACKEND}/api/nominatim/${url.search}`;
	const response = await fetch(target, { signal: AbortSignal.timeout(30000) });
	const body = await response.text();
	return new Response(body, {
		status: response.status,
		headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' }
	});
};
