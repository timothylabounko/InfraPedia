import { json } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/admin';
import type { SharingMode, SharingSettings } from '$lib/metro/types';
import type { Json } from '$lib/supabase/database.types';
import type { RequestHandler } from './$types';

const MAX_PREVIEW_BYTES = 1_500_000;

function isValidPreviewImage(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('data:image/') && value.length <= MAX_PREVIEW_BYTES;
}

function visibilityFromSharing(mode: SharingMode): string {
	if (mode === 'public') return 'public';
	if (mode === 'collaborators') return 'team';
	return 'private';
}

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: membership } = await locals.supabase
		.from('project_members')
		.select('role')
		.eq('project_id', params.id)
		.eq('user_id', locals.user.id)
		.maybeSingle();

	const { data: owned } = await locals.supabase
		.from('projects')
		.select('id')
		.eq('id', params.id)
		.eq('owner_id', locals.user.id)
		.maybeSingle();

	if (!membership && !owned) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	const body = await request.json();
	const { mapState, name, sharing, previewImage } = body as {
		mapState: unknown;
		name?: string;
		sharing?: SharingSettings;
		previewImage?: string;
	};

	if (!mapState) {
		return json({ error: 'mapState required' }, { status: 400 });
	}

	const admin = createAdminClient();

	const updates: { visibility?: string; name?: string; status?: string } = {};

	if (sharing?.mode) {
		updates.visibility = visibilityFromSharing(sharing.mode);
	}

	if (typeof name === 'string' && name.trim()) {
		updates.name = name.trim();
		updates.status = 'active';
	}

	if (Object.keys(updates).length > 0) {
		const { error: projectError } = await admin
			.from('projects')
			.update(updates)
			.eq('id', params.id);

		if (projectError) {
			return json({ error: projectError.message }, { status: 500 });
		}
	}

	if (sharing) {
		await admin.from('project_data').upsert(
			{
				project_id: params.id,
				key: 'sharing_settings',
				value: sharing as unknown as Json
			},
			{ onConflict: 'project_id,key' }
		);
	}

	const { error: mapError } = await admin.from('project_data').upsert(
		{
			project_id: params.id,
			key: 'map_state',
			value: mapState as unknown as Json
		},
		{ onConflict: 'project_id,key' }
	);

	if (mapError) {
		return json({ error: mapError.message }, { status: 500 });
	}

	if (isValidPreviewImage(previewImage)) {
		await admin.from('project_data').upsert(
			{
				project_id: params.id,
				key: 'preview_images',
				value: { images: [previewImage] } as unknown as Json
			},
			{ onConflict: 'project_id,key' }
		);
	}

	return json({ success: true });
};
