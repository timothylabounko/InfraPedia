import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Database } from '$lib/supabase/database.types';

const METRO_TYPE = {
	name: 'Metro Map Creator',
	slug: 'metro-map',
	description: 'Draw transit lines on OSM and simplify to schematic metro diagrams with AI assistance.',
	icon: 'metro',
	template_version: '1.0.0',
	metadata: { default_center: [77.209, 28.6139], default_zoom: 11 }
};

export async function ensureMetroMapProjectType() {
	if (!SUPABASE_SERVICE_ROLE_KEY) return null;

	const admin = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const { data, error } = await admin
		.from('project_types')
		.upsert(METRO_TYPE, { onConflict: 'slug' })
		.select('id, name, slug, metadata')
		.single();

	if (error) {
		console.error('ensureMetroMapProjectType:', error.message);
		return null;
	}

	return data;
}
