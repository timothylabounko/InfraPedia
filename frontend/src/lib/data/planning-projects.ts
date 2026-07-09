export type {
	TemplateConfig,
	MapTemplateSlug
} from '$lib/data/template-registry';

export {
	MAP_TEMPLATE_SLUGS,
	templateRegistry,
	mapTemplateList,
	isMapTemplateSlug,
	getTemplateConfig,
	getProjectThumbnail,
	communityForumPosts,
	createColumnForums,
	createColumnActions
} from '$lib/data/template-registry';

import { mapTemplateList, templateRegistry } from '$lib/data/template-registry';

/** Template library — all openable map templates */
export const planningProjectLibrary = mapTemplateList.map((t) => ({
	id: t.slug,
	title: t.title,
	template: t.template,
	creatorName: t.creatorName,
	slug: t.slug,
	previewHref: t.previewHref,
	forumHref: t.forumHref,
	description: t.description,
	images: t.images
}));

export const metroMapTemplateImages = templateRegistry['metro-map'].images;
