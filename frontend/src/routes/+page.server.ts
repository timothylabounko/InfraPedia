import { planningProjectLibrary } from '$lib/data/planning-projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	let userProjects: {
		id: string;
		name: string;
		description: string | null;
		project_types: { name: string } | null;
	}[] = [];

	if (locals.user) {
		const { data } = await locals.supabase
			.from('projects')
			.select('id, name, description, project_types(name)')
			.order('updated_at', { ascending: false });

		userProjects = (data ?? []) as typeof userProjects;
	}

	return {
		planningProjects: planningProjectLibrary,
		userProjects
	};
};
