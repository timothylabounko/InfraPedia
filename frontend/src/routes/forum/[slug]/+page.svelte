<script lang="ts">
	import { enhance } from '$app/forms';
	import BackButton from '$lib/components/BackButton.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let sort = $state<'hot' | 'new'>('hot');
	let title = $state('');
	let body = $state('');
	let rating = $state<number | ''>('');

	const sortedPosts = $derived.by(() => {
		const posts = [...data.feed.posts];
		if (sort === 'new') {
			return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		}
		return posts.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
	});

	function voteLabel(value: -1 | 0 | 1) {
		if (value === 1) return 'Upvoted';
		if (value === -1) return 'Downvoted';
		return 'Vote';
	}
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
	<div class="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
		<div class="mx-auto flex max-w-3xl items-center gap-3">
			<BackButton />
			<div class="min-w-0 flex-1">
				<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Community forum</p>
				<h1 class="truncate text-xl font-bold text-slate-900">{data.template.title}</h1>
				<p class="text-sm text-slate-600">
					Reviews, tips, and discussion — upvote helpful posts like Reddit.
				</p>
			</div>
			{#if data.feed.averageRating != null}
				<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
					<p class="text-lg font-bold text-amber-900">{data.feed.averageRating.toFixed(1)}★</p>
					<p class="text-[10px] font-medium uppercase tracking-wide text-amber-800">
						{data.feed.ratingCount} review{data.feed.ratingCount === 1 ? '' : 's'}
					</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl space-y-4 px-4 py-6">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-full px-3 py-1 text-sm font-medium {sort === 'hot'
						? 'bg-slate-900 text-white'
						: 'bg-white text-slate-700 ring-1 ring-slate-200'}"
					onclick={() => (sort = 'hot')}
				>
					Hot
				</button>
				<button
					type="button"
					class="rounded-full px-3 py-1 text-sm font-medium {sort === 'new'
						? 'bg-slate-900 text-white'
						: 'bg-white text-slate-700 ring-1 ring-slate-200'}"
					onclick={() => (sort = 'new')}
				>
					New
				</button>
				<a
					href={data.template.previewHref ?? `/templates/${data.subjectSlug}`}
					class="ml-auto text-sm font-medium text-sky-700 hover:underline"
				>
					Open template →
				</a>
			</div>

			{#if form?.success}
				<p class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
					Post published.
				</p>
			{/if}
			{#if form?.error}
				<p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{form.error}
				</p>
			{/if}

			{#if data.user}
				<section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<h2 class="text-sm font-semibold text-slate-900">New post</h2>
					<form
						method="POST"
						action="?/createPost"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update({ invalidateAll: true });
								if (result.type === 'success') {
									title = '';
									body = '';
									rating = '';
								}
							};
						}}
						class="mt-3 space-y-3"
					>
						<input
							type="text"
							name="title"
							required
							bind:value={title}
							placeholder="Title — e.g. Great for schematic maps"
							class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						/>
						<textarea
							name="body"
							required
							rows="4"
							bind:value={body}
							placeholder="Share a review, tip, bug report, or update idea…"
							class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						></textarea>
						<div class="flex flex-wrap items-center gap-3">
							<label class="text-sm text-slate-700">
								<span class="font-medium">Star rating</span> (optional)
								<select
									name="rating"
									bind:value={rating}
									class="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
								>
									<option value="">None</option>
									<option value="5">5 ★</option>
									<option value="4">4 ★</option>
									<option value="3">3 ★</option>
									<option value="2">2 ★</option>
									<option value="1">1 ★</option>
								</select>
							</label>
							<button
								type="submit"
								class="ml-auto rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
							>
								Post
							</button>
						</div>
					</form>
				</section>
			{:else}
				<p class="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm text-slate-600">
					<a href="/login" class="font-medium text-sky-700 hover:underline">Sign in</a> to post and vote.
				</p>
			{/if}

			<div class="space-y-3">
				{#if sortedPosts.length === 0}
					<p class="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
						No posts yet. Be the first to review or discuss this template.
					</p>
				{:else}
					{#each sortedPosts as post (post.id)}
						<article class="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
							<div class="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-1">
								{#if data.user}
									<form
										method="POST"
										action="?/vote"
										use:enhance={() => async ({ update }) => {
											await update({ invalidateAll: true });
										}}
										class="contents"
									>
										<input type="hidden" name="post_id" value={post.id} />
										<input type="hidden" name="value" value={post.userVote === 1 ? 0 : 1} />
										<button
											type="submit"
											class="rounded p-1 text-slate-500 hover:bg-orange-50 hover:text-orange-600 {post.userVote ===
											1
												? 'bg-orange-50 text-orange-600'
												: ''}"
											title="Upvote"
											aria-label="Upvote"
										>
											▲
										</button>
									</form>
								{:else}
									<span class="p-1 text-slate-300" aria-hidden="true">▲</span>
								{/if}
								<span
									class="text-sm font-bold tabular-nums {post.score > 0
										? 'text-orange-600'
										: post.score < 0
											? 'text-violet-600'
											: 'text-slate-500'}"
								>
									{post.score}
								</span>
								{#if data.user}
									<form
										method="POST"
										action="?/vote"
										use:enhance={() => async ({ update }) => {
											await update({ invalidateAll: true });
										}}
										class="contents"
									>
										<input type="hidden" name="post_id" value={post.id} />
										<input type="hidden" name="value" value={post.userVote === -1 ? 0 : -1} />
										<button
											type="submit"
											class="rounded p-1 text-slate-500 hover:bg-violet-50 hover:text-violet-600 {post.userVote ===
											-1
												? 'bg-violet-50 text-violet-600'
												: ''}"
											title="Downvote"
											aria-label="Downvote"
										>
											▼
										</button>
									</form>
								{:else}
									<span class="p-1 text-slate-300" aria-hidden="true">▼</span>
								{/if}
							</div>

							<div class="min-w-0 flex-1">
								<h3 class="text-base font-semibold leading-snug text-slate-900">{post.title}</h3>
								<p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
									{post.body}
								</p>
								<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
									<span class="font-medium text-slate-700">{post.authorName}</span>
									<span>·</span>
									<time datetime={post.createdAt}>
										{new Date(post.createdAt).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</time>
									{#if post.rating != null}
										<span class="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
											{post.rating}★ review
										</span>
									{/if}
									<span class="sr-only">{voteLabel(post.userVote)}</span>
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</main>
