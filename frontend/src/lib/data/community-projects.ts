export type CommunityProject = {
	id: string;
	title: string;
	template: string;
	author: string;
	description: string;
};

export const communityProjectPlaceholders: CommunityProject[] = [
	{
		id: 'community-1',
		title: 'Bay Bridge Retrofit',
		template: 'Structural',
		author: 'Alex Chen',
		description: 'Seismic upgrade study for a major regional crossing.'
	},
	{
		id: 'community-2',
		title: 'Greenway Network Plan',
		template: 'Parks',
		author: 'Morgan Lee',
		description: 'Connecting bike paths and pedestrian corridors across districts.'
	},
	{
		id: 'community-3',
		title: 'Smart Grid Rollout',
		template: 'Energy',
		author: 'Jordan Patel',
		description: 'Phased deployment of grid sensors and outage response tools.'
	},
	{
		id: 'community-4',
		title: 'Harbor Expansion EIA',
		template: 'Environmental',
		author: 'Sam Rivera',
		description: 'Environmental impact assessment for port capacity growth.'
	},
	{
		id: 'community-5',
		title: 'Metro Line Extension',
		template: 'Transit',
		author: 'Taylor Brooks',
		description: 'Feasibility and station placement for a new metro segment.'
	},
	{
		id: 'community-5b',
		title: 'Stormwater Master Plan',
		template: 'Utilities',
		author: 'Riley Kim',
		description: 'Citywide drainage upgrades and retention basin mapping.'
	}
];
