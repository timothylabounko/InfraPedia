import { TEMPLATE_API_BACKEND } from '$lib/server/template-api-backend';
import type { RequestHandler } from './$types';

async function proxyOverpass(request: Request) {
	const response = await fetch(`${TEMPLATE_API_BACKEND}/api/overpass/`, {
		method: 'POST',
		headers: {
			'Content-Type': request.headers.get('Content-Type') ?? 'application/x-www-form-urlencoded'
		},
		body: await request.text(),
		signal: AbortSignal.timeout(90000)
	});

	const body = await response.text();
	return new Response(body, {
		status: response.status,
		headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' }
	});
}

export const POST: RequestHandler = async ({ request }) => proxyOverpass(request);
