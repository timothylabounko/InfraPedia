import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

export type ForumPost = {
	id: string;
	title: string;
	body: string;
	rating: number | null;
	score: number;
	userVote: -1 | 0 | 1;
	createdAt: string;
	authorName: string;
	authorId: string;
};

export type ForumFeed = {
	posts: ForumPost[];
	averageRating: number | null;
	ratingCount: number;
};

type ForumRow = {
	id: string;
	title: string | null;
	body: string;
	rating: number | null;
	created_at: string;
	user_id: string;
};

type VoteRow = {
	post_id: string;
	user_id: string;
	value: number;
};

export async function loadForumFeed(
	supabase: SupabaseClient<Database>,
	subjectSlug: string,
	currentUserId?: string | null
): Promise<ForumFeed> {
	const empty: ForumFeed = { posts: [], averageRating: null, ratingCount: 0 };

	const { data, error } = await supabase
		.from('forum_posts')
		.select('id, title, body, rating, created_at, user_id')
		.eq('subject_slug', subjectSlug)
		.order('created_at', { ascending: false })
		.limit(80);

	if (error) {
		if (error.message.includes('forum_posts') || error.code === '42P01') {
			return empty;
		}
		console.error('loadForumFeed:', error.message);
		return empty;
	}

	const rows = (data ?? []) as ForumRow[];
	if (rows.length === 0) return empty;

	const postIds = rows.map((r) => r.id);
	const userIds = [...new Set(rows.map((row) => row.user_id))];
	const authorById: Record<string, { username: string | null; email: string }> = {};

	const { data: users } = await supabase
		.from('users')
		.select('id, username, email')
		.in('id', userIds);

	for (const user of users ?? []) {
		authorById[user.id] = { username: user.username, email: user.email };
	}

	const scoreByPost: Record<string, number> = {};
	const userVoteByPost: Record<string, -1 | 1> = {};

	const { data: votes, error: votesError } = await supabase
		.from('forum_votes')
		.select('post_id, user_id, value')
		.in('post_id', postIds);

	if (!votesError) {
		for (const vote of (votes ?? []) as VoteRow[]) {
			scoreByPost[vote.post_id] = (scoreByPost[vote.post_id] ?? 0) + vote.value;
			if (currentUserId && vote.user_id === currentUserId) {
				userVoteByPost[vote.post_id] = vote.value === 1 ? 1 : -1;
			}
		}
	}

	const posts: ForumPost[] = rows
		.map((row) => {
			const author = authorById[row.user_id];
			return {
				id: row.id,
				title: row.title?.trim() || row.body.slice(0, 80) || 'Untitled',
				body: row.body,
				rating: row.rating,
				score: scoreByPost[row.id] ?? 0,
				userVote: userVoteByPost[row.id] ?? 0,
				createdAt: row.created_at,
				authorId: row.user_id,
				authorName: author?.username ?? author?.email?.split('@')[0] ?? 'User'
			};
		})
		.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));

	const rated = posts.filter((p) => p.rating != null);
	const averageRating =
		rated.length > 0
			? Math.round((rated.reduce((sum, p) => sum + (p.rating ?? 0), 0) / rated.length) * 10) / 10
			: null;

	return { posts, averageRating, ratingCount: rated.length };
}

/** @deprecated Use loadForumFeed */
export async function loadForumSummary(
	supabase: SupabaseClient<Database>,
	subjectSlug: string
): Promise<ForumFeed> {
	return loadForumFeed(supabase, subjectSlug);
}

export async function createForumPost(
	supabase: SupabaseClient<Database>,
	userId: string,
	subjectSlug: string,
	title: string,
	body: string,
	rating: number | null
): Promise<{ error?: string }> {
	const trimmedTitle = title.trim();
	const trimmedBody = body.trim();
	if (!trimmedTitle) return { error: 'Title is required.' };
	if (!trimmedBody) return { error: 'Post body cannot be empty.' };
	if (trimmedTitle.length > 200) return { error: 'Title is too long.' };
	if (trimmedBody.length > 4000) return { error: 'Post body is too long.' };
	if (rating != null && (rating < 1 || rating > 5)) return { error: 'Rating must be 1–5 stars.' };

	const { error } = await supabase.from('forum_posts').insert({
		subject_slug: subjectSlug,
		user_id: userId,
		title: trimmedTitle,
		body: trimmedBody,
		rating
	});

	if (error) {
		if (error.message.includes('forum_posts') || error.code === '42P01') {
			return {
				error:
					'Forum is not set up yet. Run supabase/migrations/004_forum_posts.sql and 005_forum_votes.sql.'
			};
		}
		return { error: error.message };
	}

	return {};
}

export async function voteForumPost(
	supabase: SupabaseClient<Database>,
	userId: string,
	postId: string,
	value: -1 | 0 | 1
): Promise<{ error?: string }> {
	if (value === 0) {
		const { error } = await supabase
			.from('forum_votes')
			.delete()
			.eq('post_id', postId)
			.eq('user_id', userId);
		if (error?.message?.includes('forum_votes') || error?.code === '42P01') {
			return { error: 'Vote storage is not set up yet. Run migration 005_forum_votes.sql.' };
		}
		return error ? { error: error.message } : {};
	}

	const { error } = await supabase.from('forum_votes').upsert(
		{ post_id: postId, user_id: userId, value },
		{ onConflict: 'post_id,user_id' }
	);

	if (error) {
		if (error.message.includes('forum_votes') || error.code === '42P01') {
			return { error: 'Vote storage is not set up yet. Run migration 005_forum_votes.sql.' };
		}
		return { error: error.message };
	}

	return {};
}
