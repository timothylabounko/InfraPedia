import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: project, error: fetchError } = await locals.supabase
		.from('projects')
		.select('id, owner_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	if (project.owner_id !== locals.user.id) {
		return json({ error: 'Only the project owner can delete it' }, { status: 403 });
	}

	const { error } = await locals.supabase.from('projects').delete().eq('id', params.id);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ ok: true });
};
