export type PlanningProject = {
	id: string;
	title: string;
	template: string;
	description: string;
	creatorName: string;
	slug?: string;
	images?: string[];
	previewHref?: string;
	forumHref?: string;
};

/** Template library — only real, openable templates */
export const planningProjectLibrary: PlanningProject[] = [
	{
		id: 'metro-map',
		title: 'Metro Map Creator',
		template: 'Transit',
		creatorName: 'InfraPedia',
		slug: 'metro-map',
		previewHref: '/templates/metro-map',
		forumHref: '/forum/metro-map',
		description: 'Draw lines on OSM and simplify to a schematic metro diagram with AI help.',
		images: ['/templates/metro-map-delhi.png']
	}
];

/** Community forum entries shown as posts in the library */
export const communityForumPosts = planningProjectLibrary
	.filter((t) => t.forumHref)
	.map((t) => ({
		id: `forum-${t.slug}`,
		title: `${t.title} Forum`,
		description: 'Reviews, tips, and discussion with upvotes.',
		creatorName: t.creatorName,
		subtitle: 'Community',
		href: t.forumHref!,
		images: t.images ?? []
	}));

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
