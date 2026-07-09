import { json } from '@sveltejs/kit';
import { djangoApiUrl } from '$lib/server/django-api';
import { TEMPLATE_API_BACKEND } from '$lib/server/template-api-backend';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const slug = params.slug;
	const required = (await import('$lib/data/platform-apis')).templateApiRequirements[slug] ?? [];
	const checks: Array<{ id: string; name: string; ok: boolean; message: string }> = [];

	try {
		const res = await fetch(djangoApiUrl(TEMPLATE_API_BACKEND, 'api/health'), {
			signal: AbortSignal.timeout(4000)
		});
		const health = await res.json().catch(() => ({}));
		const backendOk = res.ok;

		for (const apiId of required) {
			const api = (await import('$lib/data/platform-apis')).getPlatformApi(apiId);
			if (!api) continue;

			if (api.requiresBackend || api.id === 'osm-osmnx') {
				checks.push({
					id: apiId,
					name: api.name,
					ok: backendOk,
					message: backendOk
						? api.id === 'osm-osmnx'
							? 'OSMnx available on InfraPedia backend'
							: 'InfraPedia backend connected'
						: 'Start the InfraPedia backend: python manage.py runserver (port 8000)'
				});
			} else if (api.requiresUserKey) {
				const keyOk =
					api.id === 'ipums'
						? String(health.ipums ?? '').toLowerCase().includes('verified')
						: true;
				checks.push({
					id: apiId,
					name: api.name,
					ok: keyOk,
					message: keyOk
						? 'Configured on server'
						: `Add ${api.keyEnvHint} to backend/.env or use your own key below`
				});
			}
		}
	} catch {
		for (const apiId of required) {
			const api = (await import('$lib/data/platform-apis')).getPlatformApi(apiId);
			if (!api) continue;
			checks.push({
				id: apiId,
				name: api.name,
				ok: false,
				message: 'InfraPedia backend not running on port 8000'
			});
		}
	}

	const ok = checks.length === 0 || checks.every((c) => c.ok);
	return json({ ok, checks, required });
};
