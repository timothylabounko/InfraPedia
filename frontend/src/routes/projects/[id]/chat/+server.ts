import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { role, content, tool_calls } = body;

	if (!role || !content) {
		return json({ error: 'role and content required' }, { status: 400 });
	}

	const { data, error: insertError } = await locals.supabase
		.from('chat_messages')
		.insert({
			project_id: params.id,
			user_id: role === 'user' ? locals.user.id : null,
			role,
			content,
			tool_calls: tool_calls ?? []
		})
		.select('id, role, content, tool_calls, created_at')
		.single();

	if (insertError) {
		return json({ error: insertError.message }, { status: 500 });
	}

	return json({ message: data });
};
