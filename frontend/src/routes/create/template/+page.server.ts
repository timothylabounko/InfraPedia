import { createAdminClient } from '$lib/server/admin';
import { getSiteOwner } from '$lib/server/site-user';
import { fail, redirect } from '@sveltejs/kit';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Actions, PageServerLoad } from './$types';

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);
}

type FileWithPath = File & { webkitRelativePath?: string };

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to publish a template.' });
		}

		const formData = await request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const description = String(formData.get('description') ?? '').trim();
		const mapLibrary = String(formData.get('map_library') ?? 'leaflet');
		const publishMode = String(formData.get('publish_mode') ?? 'metadata');
		const requiredApis = formData.getAll('required_apis').map(String);

		if (!title) {
			return fail(400, { error: 'Title is required.', title });
		}

		if (mapLibrary !== 'leaflet' && mapLibrary !== 'mapbox') {
			return fail(400, { error: 'Map library must be Leaflet or Mapbox.', title });
		}

		const siteOwner = await getSiteOwner();
		if (!siteOwner) {
			return fail(400, {
				error: 'tim.labounko@gmail.com must sign in once before templates can be published.',
				title
			});
		}

		const slug = slugify(title);
		if (!slug) {
			return fail(400, { error: 'Could not generate a valid template slug.', title });
		}

		let embedPath: string | null = null;

		if (publishMode === 'folder') {
			const files = formData.getAll('template_files').filter((f): f is File => f instanceof File);
			if (files.length === 0) {
				return fail(400, { error: 'Select a template folder to upload.', title });
			}

			const hasIndex = files.some((file) => {
				const rel = relativePath(file);
				return rel === 'index.html' || rel.endsWith('/index.html');
			});
			if (!hasIndex) {
				return fail(400, {
					error: 'Template folder must include index.html at the root.',
					title
				});
			}

			const outDir = path.resolve('static', 'template-apps', 'custom', slug);
			await mkdir(outDir, { recursive: true });

			for (const file of files) {
				const rel = relativePath(file).replace(/^[^/]+\//, '');
				if (!rel || rel.includes('..')) continue;
				const dest = path.join(outDir, rel);
				await mkdir(path.dirname(dest), { recursive: true });
				const buffer = Buffer.from(await file.arrayBuffer());
				await writeFile(dest, buffer);
			}

			embedPath = `/template-apps/custom/${slug}/index.html`;
		}

		const admin = createAdminClient();
		const { data: projectType, error } = await admin
			.from('project_types')
			.insert({
				name: title,
				slug,
				description: description || `Map template: ${title}`,
				icon: 'map',
				template_version: '1.0.0',
				metadata: {
					user_created: true,
					map_library: mapLibrary,
					required_apis: requiredApis,
					embed_path: embedPath,
					default_center: [40.758, -73.9855],
					default_zoom: 11,
					created_by: locals.user.id
				}
			})
			.select('slug')
			.single();

		if (error) {
			if (error.code === '23505') {
				return fail(400, { error: 'A template with a similar name already exists.', title });
			}
			return fail(500, { error: error.message, title });
		}

		redirect(303, `/templates/${projectType.slug}`);
	}
};

function relativePath(file: FileWithPath) {
	return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}
