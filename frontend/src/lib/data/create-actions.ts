export type CreateAction = {
	id: string;
	title: string;
	description: string;
	kind: 'template' | 'news' | 'post';
};

export const createActions: CreateAction[] = [
	{
		id: 'create-template',
		title: 'New Template',
		description: 'Design a reusable planning template for the community.',
		kind: 'template'
	},
	{
		id: 'create-news',
		title: 'Post News',
		description: 'Share updates, announcements, or policy changes.',
		kind: 'news'
	},
	{
		id: 'create-post',
		title: 'New Post',
		description: 'Publish a project update or discussion thread.',
		kind: 'post'
	},
	{
		id: 'create-project',
		title: 'Start Project',
		description: 'Launch a new infrastructure planning workspace.',
		kind: 'post'
	},
	{
		id: 'create-layer',
		title: 'Add Map Layer',
		description: 'Upload geospatial layers to an existing project.',
		kind: 'template'
	},
	{
		id: 'create-invite',
		title: 'Invite Collaborators',
		description: 'Bring teammates into a shared planning project.',
		kind: 'post'
	}
];
