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
