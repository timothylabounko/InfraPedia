<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import CreateProjectBar from '$lib/components/metro/CreateProjectBar.svelte';
	import LibraryImageCarousel from '$lib/components/LibraryImageCarousel.svelte';
	import PageColumnBand from '$lib/components/PageColumnBand.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state('');

	$effect(() => {
		const formTitle = (form as { title?: string } | null | undefined)?.title;
		if (formTitle) title = formTitle;
	});
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
	<PageColumnBand
		tone="red"
		eyebrow="Template"
		title={data.title}
		subtitle="by {data.creatorName}"
	>
		{#snippet actions()}
			<a
				href={data.forumHref}
				class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
			>
				Community forum
			</a>
		{/snippet}
	</PageColumnBand>

	<CreateProjectBar error={form?.error ?? null}>
		<form method="POST" action="?/create" class="flex w-full flex-wrap items-end gap-3">
			<label class="flex min-w-[14rem] flex-1 flex-col gap-0.5 text-xs text-slate-700">
				<span class="font-medium">Project title</span>
				<input
					id="title"
					name="title"
					type="text"
					required
					bind:value={title}
					placeholder="e.g. My corridor study"
					class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
				/>
			</label>
			<button
				type="submit"
				class="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
			>
				{data.createButtonLabel}
			</button>
		</form>
	</CreateProjectBar>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-4xl px-6 py-8">
			<p class="mb-6 text-slate-600">{data.description}</p>

			<div class="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<LibraryImageCarousel images={data.images} alt="{data.title} preview" />
			</div>

			<section class="rounded-xl border border-slate-200 bg-slate-50 p-6">
				<h2 class="text-lg font-semibold text-slate-900">Instructions</h2>
				<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
					{#each data.instructions as step}
						<li>{step}</li>
					{/each}
				</ul>
				<p class="mt-4 text-xs text-slate-500">
					Your project saves the last map view and data so you can return and continue editing.
				</p>
				<p class="mt-3 text-sm text-slate-600">
					Questions or feedback?
					<a href={data.forumHref} class="font-medium text-sky-700 hover:underline">
						Visit the community forum
					</a>
					for reviews, tips, and discussion.
				</p>
			</section>
		</div>
	</div>
</main>
