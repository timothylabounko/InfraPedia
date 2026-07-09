import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SLUGS = new Set([
	'transit-propensity',
	'bikeability',
	'micromobility-light',
	'food-journey'
]);

export const GET: RequestHandler = async ({ params, url }) => {
	if (!SLUGS.has(params.slug)) {
		return new Response('Not found', { status: 404 });
	}

	const target = `/template-apps/${params.slug}/index.html${url.search}`;
	redirect(303, target);
};
