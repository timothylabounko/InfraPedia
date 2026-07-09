import { djangoApiUrl } from '$lib/server/django-api';
import { TEMPLATE_API_BACKEND } from '$lib/server/template-api-backend';
import type { RequestHandler } from './$types';

const BACKEND = `${TEMPLATE_API_BACKEND}/api`;

export const GET: RequestHandler = async ({ params, url }) => {
	const target = djangoApiUrl(BACKEND, params.path ?? '', url.search);

	try {
		const response = await fetch(target, { signal: AbortSignal.timeout(10000) });
		const body = await response.text();
		return new Response(body, {
			status: response.status,
			headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' }
		});
	} catch {
		return new Response(
			JSON.stringify({
				status: 'error',
				message: 'InfraPedia backend is not running. Start: cd backend && python manage.py runserver'
			}),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}
};

export const POST: RequestHandler = async ({ params, request, url }) => {
	const target = djangoApiUrl(BACKEND, params.path ?? '', url.search);

	try {
		const response = await fetch(target, {
			method: 'POST',
			headers: { 'Content-Type': request.headers.get('Content-Type') ?? 'application/json' },
			body: await request.text(),
			signal: AbortSignal.timeout(300000)
		});

		const body = await response.text();
		return new Response(body, {
			status: response.status,
			headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' }
		});
	} catch {
		return new Response(
			JSON.stringify({
				status: 'error',
				message: 'InfraPedia backend is not running. Start: cd backend && python manage.py runserver'
			}),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
