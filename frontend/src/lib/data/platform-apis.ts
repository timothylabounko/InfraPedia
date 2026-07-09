export const COMMUNITY_FORUM_IMAGE = '/templates/community-forum.svg';

export type PlatformApi = {
	id: string;
	name: string;
	description: string;
	proxyPath?: string;
	requiresBackend?: boolean;
	backendEnvVar?: string;
	requiresUserKey?: boolean;
	keyEnvHint?: string;
};

/** APIs provided by the single InfraPedia Django backend (port 8000). */
export const platformApis: PlatformApi[] = [
	{
		id: 'osm-osmnx',
		name: 'OpenStreetMap (OSMnx)',
		description:
			'Geocoding and street-network queries via OSMnx on the InfraPedia server. No OSM API key required.',
		proxyPath: '/api/osm',
		requiresBackend: true
	},
	{
		id: 'bikeability-backend',
		name: 'Bikeability analysis',
		description: 'California street bike-safety scoring (OSMnx + TIMS).',
		proxyPath: '/api/bikeability/city',
		requiresBackend: true
	},
	{
		id: 'transit-propensity-backend',
		name: 'Transit propensity analysis',
		description: 'Corridor and station demographic scoring.',
		proxyPath: '/api/transit-propensity',
		requiresBackend: true
	},
	{
		id: 'ipums',
		name: 'IPUMS API',
		description: 'US census tract demographics for transit propensity.',
		requiresUserKey: true,
		keyEnvHint: 'IPUMS_API_KEY'
	},
	{
		id: 'mapbox',
		name: 'Mapbox',
		description: 'Optional Mapbox GL map tiles and geocoding.',
		requiresUserKey: true,
		keyEnvHint: 'MAPBOX_ACCESS_TOKEN'
	}
];

export type TemplateApiRequirement = {
	apiId: string;
	usePlatform: boolean;
	userApiKey?: string;
};

export function getPlatformApi(id: string) {
	return platformApis.find((api) => api.id === id) ?? null;
}

export const templateApiRequirements: Record<string, string[]> = {
	'transit-propensity': ['transit-propensity-backend', 'ipums', 'osm-osmnx'],
	bikeability: ['bikeability-backend', 'osm-osmnx'],
	'micromobility-light': ['osm-osmnx'],
	'food-journey': ['osm-osmnx']
};
