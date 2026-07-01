export type ProjectVisibilityTheme = 'light' | 'grey' | 'dark';

export function visibilityTheme(visibility: string): ProjectVisibilityTheme {
	if (visibility === 'public') return 'light';
	if (visibility === 'team') return 'grey';
	return 'dark';
}

export function visibilityLabel(visibility: string): string {
	if (visibility === 'public') return 'Public';
	if (visibility === 'team') return 'Collaborators';
	return 'Private';
}
