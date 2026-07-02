export type LibraryProject = {
	id: string;
	name: string;
	description: string | null;
	visibility: string;
	isOwner: boolean;
	creatorEmail: string;
	creatorName: string;
	project_types: { name: string; slug: string } | null;
	images: string[];
};

export type LibraryCommunityPost = {
	id: string;
	title: string;
	description: string;
	creatorName: string;
	subtitle: string;
	href: string;
	images: string[];
};
