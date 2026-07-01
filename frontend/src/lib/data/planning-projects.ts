export type PlanningProject = {
	id: string;
	title: string;
	template: string;
	description: string;
};

export const planningProjectLibrary: PlanningProject[] = [
	{
		id: 'placeholder-1',
		title: 'Highway Corridor Study',
		template: 'Transportation',
		description: 'Evaluate alignment options, traffic impacts, and environmental constraints.'
	},
	{
		id: 'placeholder-2',
		title: 'Water Treatment Plant Expansion',
		template: 'Utilities',
		description: 'Plan capacity upgrades, site layout, and phased construction.'
	},
	{
		id: 'placeholder-3',
		title: 'Downtown Revitalization Plan',
		template: 'Urban Planning',
		description: 'Coordinate land use, streetscape improvements, and public space design.'
	},
	{
		id: 'placeholder-4',
		title: 'Regional Transit Hub',
		template: 'Transit',
		description: 'Design multimodal connections, station access, and ridership forecasts.'
	},
	{
		id: 'placeholder-5',
		title: 'Flood Mitigation Master Plan',
		template: 'Resilience',
		description: 'Map flood zones, drainage improvements, and emergency response routes.'
	},
	{
		id: 'placeholder-6',
		title: 'Industrial Park Infrastructure',
		template: 'Economic Development',
		description: 'Plan utilities, road networks, and site servicing for new development.'
	}
];
