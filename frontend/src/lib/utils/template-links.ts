import { isMapTemplateSlug } from '$lib/data/template-registry';

export function projectEditorHref(
	projectTypeSlug: string | null | undefined,
	projectId: string
): string | undefined {
	if (!isMapTemplateSlug(projectTypeSlug)) return undefined;
	if (projectTypeSlug === 'metro-map') return `/projects/${projectId}`;
	return `/projects/${projectId}/map`;
}
