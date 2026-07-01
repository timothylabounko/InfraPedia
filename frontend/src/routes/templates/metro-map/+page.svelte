<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import CreateProjectBar from '$lib/components/metro/CreateProjectBar.svelte';
	import LibraryImageCarousel from '$lib/components/LibraryImageCarousel.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? '');
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
	<div class="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
		<BackButton />
		<div class="min-w-0">
			<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Template</p>
			<h1 class="truncate text-xl font-bold text-slate-900">{data.title}</h1>
		</div>
	</div>

	<CreateProjectBar error={form?.error ?? null}>
		<form method="POST" action="?/create" class="flex flex-wrap items-end gap-3">
			<label class="flex min-w-[14rem] flex-col gap-0.5 text-xs text-slate-700">
				<span class="font-medium">Project title</span>
				<input
					id="title"
					name="title"
					type="text"
					required
					bind:value={title}
					placeholder="e.g. Delhi Metro Redesign"
					class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
				/>
			</label>
			<button
				type="submit"
				class="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
			>
				Create your own metro map
			</button>
		</form>
	</CreateProjectBar>

	<div class="flex-1 overflow-y-auto">
	<div class="mx-auto max-w-4xl px-6 py-8">
		<p class="mb-6 text-slate-600">{data.description}</p>

		<div class="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<LibraryImageCarousel images={data.images} alt="Metro map template preview" />
		</div>

		<section class="rounded-xl border border-slate-200 bg-slate-50 p-6">
			<h2 class="text-lg font-semibold text-slate-900">What you can do</h2>
			<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
				<li>Draw transit lines on a live OpenStreetMap base (Leaflet)</li>
				<li>Pick line colors and styles (Boston MBTA, NYC Subway, Delhi, and more)</li>
				<li>Simplify to a schematic metro style (like the example above)</li>
				<li>Toggle geographic vs schematic view, or start from scratch on a blank grid</li>
				<li>Ask the AI assistant to zoom, draw, simplify, or undo</li>
				<li>Save and choose private, collaborator, or public sharing</li>
			</ul>
			<p class="mt-4 text-xs text-slate-500">
				Your project appears in the library after you save it in the editor.
			</p>
		</section>
	</div>
	</div>
</main>
