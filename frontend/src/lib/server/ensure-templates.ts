import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Database } from '$lib/supabase/database.types';
import type { Json } from '$lib/supabase/database.types';
import { mapTemplateList } from '$lib/data/template-registry';

export async function ensureMapTemplateTypes() {
	if (!SUPABASE_SERVICE_ROLE_KEY) return null;

	const admin = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const rows = mapTemplateList.map((t) => ({
		name: t.title,
		slug: t.slug,
		description: t.description,
		icon: t.icon,
		template_version: t.templateVersion,
		metadata: {
			default_center: t.defaultMapState.center,
			default_zoom: t.defaultMapState.zoom,
			...(t.requiresBackend
				? { requires_backend: true, backend_port: t.backendPort }
				: {})
		} as Json
	}));

	const { error } = await admin.from('project_types').upsert(rows, { onConflict: 'slug' });
	if (error) {
		console.error('ensureMapTemplateTypes:', error.message);
		return null;
	}

	return rows;
}
