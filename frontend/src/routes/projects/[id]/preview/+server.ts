import { json } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/admin';
import type { Json } from '$lib/supabase/database.types';
import type { RequestHandler } from './$types';

const MAX_PREVIEW_BYTES = 1_500_000;

function isValidPreviewImage(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('data:image/') && value.length <= MAX_PREVIEW_BYTES;
}

export const POST: RequestHandler = async ({ request, locals, params }) => {
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
		return json({ error: 'Only the project owner can update the cover' }, { status: 403 });
	}

	const body = await request.json();
	const image = body?.image;

	if (!isValidPreviewImage(image)) {
		return json({ error: 'Invalid or too large image' }, { status: 400 });
	}

	const admin = createAdminClient();
	const { error } = await admin.from('project_data').upsert(
		{
			project_id: params.id,
			key: 'preview_images',
			value: { images: [image] } as unknown as Json
		},
		{ onConflict: 'project_id,key' }
	);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ ok: true, images: [image] });
};
