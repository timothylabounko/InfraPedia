import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export type ProjectListItem = {
	id: string;
	name: string;
	description: string | null;
	status: string;
	visibility: string;
	created_at: string;
	project_types: { name: string; slug: string } | null;
};

export type ProjectTypeOption = {
	id: string;
	name: string;
	slug: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	const [{ data: projects, error: projectsError }, { data: projectTypes, error: typesError }] =
		await Promise.all([
			locals.supabase
				.from('projects')
				.select('id, name, description, status, visibility, created_at, project_types(name, slug)')
				.order('updated_at', { ascending: false }),
			locals.supabase.from('project_types').select('id, name, slug').order('name')
		]);

	if (projectsError) {
		error(500, projectsError.message);
	}

	if (typesError) {
		error(500, typesError.message);
	}

	return {
		projects: (projects ?? []) as ProjectListItem[],
		projectTypes: (projectTypes ?? []) as ProjectTypeOption[]
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in required' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const projectTypeId = String(form.get('project_type_id') ?? '').trim();

		if (!name) {
			return fail(400, { error: 'Project name is required' });
		}

		if (!projectTypeId) {
			return fail(400, { error: 'Project type is required' });
		}

		const { data: project, error: insertError } = await locals.supabase
			.from('projects')
			.insert({
				name,
				description: description || null,
				owner_id: locals.user.id,
				project_type_id: projectTypeId
			})
			.select('id')
			.single();

		if (insertError) {
			return fail(500, { error: insertError.message });
		}

		await locals.supabase.from('project_members').insert({
			project_id: project.id,
			user_id: locals.user.id,
			role: 'owner'
		});

		return { success: true };
	}
};
