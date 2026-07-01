import { metroMapTemplateImages } from '$lib/data/planning-projects';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return {
		title: 'Metro Map Creator',
		description:
			'Start from this Delhi schematic metro map example. Draw your own lines on OpenStreetMap, then simplify them into a clean diagram with 45° and 90° angles — by hand or with the AI assistant.',
		images: metroMapTemplateImages,
		slug: 'metro-map'
	};
};
