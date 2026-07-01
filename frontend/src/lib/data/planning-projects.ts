export type PlanningProject = {
	id: string;
	title: string;
	template: string;
	description: string;
	slug?: string;
	images?: string[];
	previewHref?: string;
};

/** Template library — only real, openable templates */
export const planningProjectLibrary: PlanningProject[] = [
	{
		id: 'metro-map',
		title: 'Metro Map Creator',
		template: 'Transit',
		slug: 'metro-map',
		previewHref: '/templates/metro-map',
		description: 'Draw lines on OSM and simplify to a schematic metro diagram with AI help.',
		images: ['/templates/metro-map-delhi.png']
	}
];

export const metroMapTemplateImages = [
	'/templates/metro-map-delhi.png'
];

export function getProjectThumbnail(
	projectTypeSlug: string | null | undefined,
	customImages?: string[] | null
) {
	if (customImages && customImages.length > 0) return customImages;
	if (projectTypeSlug === 'metro-map') return metroMapTemplateImages;
	return ['/templates/metro-map-delhi.png'];
}
