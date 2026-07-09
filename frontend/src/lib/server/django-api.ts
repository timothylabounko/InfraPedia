/** Build a Django API URL with a trailing slash (required by Django routing). */
export function djangoApiUrl(base: string, path: string, search = '') {
	const normalized = path.replace(/^\/+|\/+$/g, '');
	const slashPath = normalized ? `${normalized}/` : '';
	return `${base.replace(/\/$/, '')}/${slashPath}${search}`;
}
