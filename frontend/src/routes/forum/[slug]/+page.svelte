<script lang="ts">
	import { enhance } from '$app/forms';
	import PageColumnBand from '$lib/components/PageColumnBand.svelte';
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
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
	<PageColumnBand
		tone="yellow"
		eyebrow="Community forum"
		title={data.template.title}
		subtitle="Reviews, tips, and discussion"
	>
		{#snippet actions()}
			{#if data.feed.averageRating != null}
				<div class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-center">
					<p class="text-sm font-bold text-slate-900">{data.feed.averageRating.toFixed(1)}★</p>
					<p class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
						{data.feed.ratingCount} review{data.feed.ratingCount === 1 ? '' : 's'}
					</p>
				</div>
			{/if}
			{#if data.template.previewHref}
				<a
					href={data.template.previewHref}
					class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
				>
					Open template
				</a>
			{/if}
		{/snippet}
	</PageColumnBand>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl space-y-3 px-4 py-4">
			<div class="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
				<button
					type="button"
					class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide {sort === 'hot'
						? 'bg-slate-900 text-white'
						: 'text-slate-600 hover:bg-slate-100'}"
					onclick={() => (sort = 'hot')}
				>
					Hot
				</button>
				<button
					type="button"
					class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide {sort === 'new'
						? 'bg-slate-900 text-white'
						: 'text-slate-600 hover:bg-slate-100'}"
					onclick={() => (sort = 'new')}
				>
					New
				</button>
				<span class="ml-auto text-xs text-slate-500">{sortedPosts.length} posts</span>
			</div>

			{#if form?.success}
				<p class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
					Post published.
				</p>
			{/if}
			{#if form?.error}
				<p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{form.error}
				</p>
			{/if}

			{#if data.user}
				<section class="overflow-hidden rounded-md border border-slate-200 bg-white">
					<div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
						Create post
					</div>
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
						class="space-y-2 p-3"
					>
						<input
							type="text"
							name="title"
							required
							bind:value={title}
							placeholder="Title"
							class="w-full rounded border border-slate-300 px-3 py-2 text-sm font-medium"
						/>
						<textarea
							name="body"
							required
							rows="4"
							bind:value={body}
							placeholder="Text (optional)"
							class="w-full rounded border border-slate-300 px-3 py-2 text-sm"
						></textarea>
						<div class="flex flex-wrap items-center gap-3">
							<label class="text-xs text-slate-600">
								Star rating
								<select
									name="rating"
									bind:value={rating}
									class="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
								>
									<option value="">None</option>
									{#each [5, 4, 3, 2, 1] as stars}
										<option value={stars}>{stars} ★</option>
									{/each}
								</select>
							</label>
							<button
								type="submit"
								class="ml-auto rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
							>
								Post
							</button>
						</div>
					</form>
				</section>
			{:else}
				<p class="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm text-slate-600">
					<a href="/login" class="font-medium text-sky-700 hover:underline">Sign in</a> to post and vote.
				</p>
			{/if}

			<div class="space-y-2">
				{#if sortedPosts.length === 0}
					<p class="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
						No posts yet. Be the first to start the discussion.
					</p>
				{:else}
					{#each sortedPosts as post (post.id)}
						<article class="flex overflow-hidden rounded-md border border-slate-200 bg-white">
							<div
								class="flex w-11 shrink-0 flex-col items-center border-r border-slate-100 bg-slate-50 py-2"
							>
								{#if data.user}
									<form method="POST" action="?/vote" use:enhance class="contents">
										<input type="hidden" name="post_id" value={post.id} />
										<input type="hidden" name="value" value={post.userVote === 1 ? 0 : 1} />
										<button
											type="submit"
											class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-900 {post.userVote ===
											1
												? 'text-slate-900'
												: ''}"
											aria-label="Upvote"
										>
											▲
										</button>
									</form>
								{:else}
									<span class="text-slate-300">▲</span>
								{/if}
								<span
									class="py-0.5 text-xs font-bold tabular-nums {post.score > 0
										? 'text-slate-900'
										: post.score < 0
											? 'text-slate-500'
											: 'text-slate-400'}"
								>
									{post.score}
								</span>
								{#if data.user}
									<form method="POST" action="?/vote" use:enhance class="contents">
										<input type="hidden" name="post_id" value={post.id} />
										<input type="hidden" name="value" value={post.userVote === -1 ? 0 : -1} />
										<button
											type="submit"
											class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 {post.userVote ===
											-1
												? 'text-slate-700'
												: ''}"
											aria-label="Downvote"
										>
											▼
										</button>
									</form>
								{:else}
									<span class="text-slate-300">▼</span>
								{/if}
							</div>

							<div class="min-w-0 flex-1 px-3 py-2.5">
								<p class="text-[11px] font-medium text-slate-500">
									Posted by <span class="text-slate-700">{post.authorName}</span>
									·
									<time datetime={post.createdAt}>
										{new Date(post.createdAt).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</time>
									{#if post.rating != null}
										· <span class="text-slate-600">{post.rating}★ review</span>
									{/if}
								</p>
								<h3 class="mt-0.5 text-base font-semibold leading-snug text-slate-900">
									{post.title}
								</h3>
								{#if post.body}
									<p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
										{post.body}
									</p>
								{/if}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</main>
