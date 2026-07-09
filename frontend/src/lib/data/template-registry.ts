import { COMMUNITY_FORUM_IMAGE } from '$lib/data/platform-apis';

export const MAP_TEMPLATE_SLUGS = [
	'metro-map',
	'transit-propensity',
	'bikeability',
	'micromobility-light',
	'food-journey'
] as const;

export type MapTemplateSlug = (typeof MAP_TEMPLATE_SLUGS)[number];

export type TemplateConfig = {
	slug: MapTemplateSlug;
	title: string;
	template: string;
	description: string;
	creatorName: string;
	icon: string;
	templateVersion: string;
	images: string[];
	previewHref: string;
	forumHref: string;
	embedPath: string;
	requiresBackend?: boolean;
	backendPort?: number;
	defaultMapState: Record<string, unknown>;
	instructions: string[];
	createButtonLabel: string;
};

const SITE_OWNER_NAME = 'Tim Labounko';

export const templateRegistry: Record<MapTemplateSlug, TemplateConfig> = {
	'metro-map': {
		slug: 'metro-map',
		title: 'Metro Map Creator',
		template: 'Transit',
		description:
			'Draw transit lines on OpenStreetMap and simplify to schematic metro diagrams with AI assistance.',
		creatorName: SITE_OWNER_NAME,
		icon: 'metro',
		templateVersion: '1.0.0',
		images: ['/templates/metro-map-delhi.png'],
		previewHref: '/templates/metro-map',
		forumHref: '/forum/metro-map',
		embedPath: '',
		defaultMapState: {
			viewMode: 'geographic',
			mapSource: 'osm',
			center: [77.209, 28.6139],
			zoom: 11
		},
		instructions: [
			'Choose OpenStreetMap or a blank white base before you create the project',
			'Draw transit lines and pick city styles',
			'Simplify to a schematic metro style',
			'Ask the AI assistant to zoom, draw, simplify, or undo'
		],
		createButtonLabel: 'Create your own metro map'
	},
	'transit-propensity': {
		slug: 'transit-propensity',
		title: 'Transit Propensity Analyzer',
		template: 'Transit',
		description:
			'Draw a transit corridor, place stations, and score census tracts by transit propensity.',
		creatorName: SITE_OWNER_NAME,
		icon: 'transit',
		templateVersion: '1.0.0',
		images: ['/templates/transit-propensity.svg'],
		previewHref: '/templates/transit-propensity',
		forumHref: '/forum/transit-propensity',
		embedPath: '/template-apps/transit-propensity/index.html',
		requiresBackend: true,
		backendPort: 8000,
		defaultMapState: {
			center: [39.8283, -98.5795],
			zoom: 4,
			corridor: null,
			stations: [],
			layerVisibility: {},
			ioInputs: null,
			ioOutputs: null
		},
		instructions: [
			'Draw a corridor on the map using the draw tools',
			'Place stations along the corridor and set walk-shed minutes',
			'Use the chat panel to run corridor and station analysis',
			'Save your project to keep the map state and results'
		],
		createButtonLabel: 'Create your own transit analysis'
	},
	bikeability: {
		slug: 'bikeability',
		title: 'Bikeability Analyzer',
		template: 'Micromobility',
		description:
			'Score city street networks for bike safety using OSM data, crash records, and bike lane coverage.',
		creatorName: SITE_OWNER_NAME,
		icon: 'bike',
		templateVersion: '1.0.0',
		images: ['/templates/bikeability.svg'],
		previewHref: '/templates/bikeability',
		forumHref: '/forum/bikeability',
		embedPath: '/template-apps/bikeability/index.html',
		requiresBackend: true,
		backendPort: 8000,
		defaultMapState: {
			center: [36.7783, -119.4179],
			zoom: 6,
			city: '',
			weights: null,
			accidentYear: null,
			streetNetwork: null
		},
		instructions: [
			'Enter a California city name in the chat panel',
			'Adjust scoring weights and accident year as needed',
			'Explore street-level bike safety scores on the map',
			'Save your project to keep the city analysis and map view'
		],
		createButtonLabel: 'Create your own bikeability map'
	},
	'micromobility-light': {
		slug: 'micromobility-light',
		title: 'Pedestrian Intersection Counter',
		template: 'Micromobility',
		description:
			'Count pedestrians at intersections, simulate crossing movements, and visualize walkable networks.',
		creatorName: SITE_OWNER_NAME,
		icon: 'pedestrian',
		templateVersion: '1.0.0',
		images: ['/templates/micromobility-light.svg'],
		previewHref: '/templates/micromobility-light',
		forumHref: '/forum/micromobility-light',
		embedPath: '/template-apps/micromobility-light/index.html',
		defaultMapState: {
			center: [40.758, -73.9855],
			zoom: 14,
			phase: 'choosing_type',
			intersectionMode: null,
			analysis: null,
			approachCounts: {},
			crosswalkSignal: null
		},
		instructions: [
			'Choose crosswalk or pedestrian-only intersection mode',
			'Place count points on the map or draw a walk area',
			'Enter approach counts in the chat panel',
			'Run the pedestrian simulation and save your project'
		],
		createButtonLabel: 'Create your own intersection study'
	},
	'food-journey': {
		slug: 'food-journey',
		title: 'Food Journey Map Tracker',
		template: 'Places',
		description:
			'Track and rate food spots on a map — filter by cuisine, add notes, photos, and build your own journey.',
		creatorName: SITE_OWNER_NAME,
		icon: 'food',
		templateVersion: '1.0.0',
		images: ['/templates/food-journey.svg'],
		previewHref: '/templates/food-journey',
		forumHref: '/forum/food-journey',
		embedPath: '/template-apps/food-journey/index.html',
		defaultMapState: {
			center: [1.3521, 103.8198],
			zoom: 12,
			places: [],
			ratings: {},
			filterFood: ''
		},
		instructions: [
			'Browse rated food spots on the map',
			'Filter by food type and click markers for details',
			'Add your own places by clicking the map',
			'Save your project to keep ratings, notes, and custom places'
		],
		createButtonLabel: 'Create your own food journey map'
	}
};

export const mapTemplateList = MAP_TEMPLATE_SLUGS.map((slug) => templateRegistry[slug]);

export function isMapTemplateSlug(slug: string | null | undefined): slug is MapTemplateSlug {
	return !!slug && MAP_TEMPLATE_SLUGS.includes(slug as MapTemplateSlug);
}

export function getTemplateConfig(slug: string | null | undefined): TemplateConfig | null {
	if (!isMapTemplateSlug(slug)) return null;
	return templateRegistry[slug];
}

export function getProjectThumbnail(
	projectTypeSlug: string | null | undefined,
	customImages?: string[] | null
) {
	if (customImages && customImages.length > 0) return customImages;
	const config = getTemplateConfig(projectTypeSlug);
	if (config) return config.images;
	return ['/templates/metro-map-delhi.png'];
}

export const communityForumPosts = mapTemplateList
	.filter((t) => t.forumHref)
	.map((t) => ({
		id: `forum-${t.slug}`,
		title: `${t.title} Forum`,
		description: 'Reviews, tips, and discussion with upvotes.',
		creatorName: t.creatorName,
		subtitle: 'Community',
		href: t.forumHref,
		images: [COMMUNITY_FORUM_IMAGE]
	}));

/** Forums and chats shown in the blue Create column */
export const createColumnActions = [
	{
		id: 'create-template',
		title: 'New Template',
		description: 'Publish a reusable map-based project template (Leaflet or Mapbox).',
		subtitle: 'Template',
		href: '/create/template',
		images: [COMMUNITY_FORUM_IMAGE]
	},
	{
		id: 'create-forum',
		title: 'New Forum',
		description: 'Start a community forum page for discussion and tips.',
		subtitle: 'Forum',
		href: '/create/forum',
		images: [COMMUNITY_FORUM_IMAGE]
	}
];

export const createColumnForums = mapTemplateList.map((t) => ({
	id: `create-forum-${t.slug}`,
	title: `${t.title} Chat`,
	description: `Discuss ${t.title.toLowerCase()} tips, workflows, and questions.`,
	creatorName: t.creatorName,
	subtitle: 'Forum',
	href: t.forumHref,
	images: [COMMUNITY_FORUM_IMAGE]
}));
