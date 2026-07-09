<script lang="ts">
	import CreateProjectBar from '$lib/components/metro/CreateProjectBar.svelte';
	import LibraryImageCarousel from '$lib/components/LibraryImageCarousel.svelte';
	import PageColumnBand from '$lib/components/PageColumnBand.svelte';
	import type { MapSource } from '$lib/metro/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let title = $state(form?.title ?? '');
	let mapSource = $state<MapSource>((form?.mapSource as MapSource | undefined) ?? 'osm');
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
	<PageColumnBand tone="red" eyebrow="Template" title={data.title} subtitle="by InfraPedia">
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
		<form method="POST" action="?/create" class="flex w-full flex-col gap-4">
			<fieldset class="space-y-2">
				<legend class="text-xs font-semibold uppercase tracking-wide text-slate-600">
					Map base layer
				</legend>
				<div class="grid gap-2 sm:grid-cols-2">
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition {mapSource ===
						'osm'
							? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
							: 'border-slate-200 bg-white hover:border-slate-300'}"
					>
						<input
							type="radio"
							name="map_source"
							value="osm"
							bind:group={mapSource}
							class="mt-0.5"
						/>
						<span>
							<span class="block text-sm font-medium text-slate-900">OpenStreetMap</span>
							<span class="mt-0.5 block text-xs text-slate-600">
								Draw on a live street map — best for real-world geography.
							</span>
						</span>
					</label>
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition {mapSource ===
						'scratch'
							? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
							: 'border-slate-200 bg-white hover:border-slate-300'}"
					>
						<input
							type="radio"
							name="map_source"
							value="scratch"
							bind:group={mapSource}
							class="mt-0.5"
						/>
						<span>
							<span class="block text-sm font-medium text-slate-900">Blank white canvas</span>
							<span class="mt-0.5 block text-xs text-slate-600">
								Start on an empty schematic grid with no map tiles underneath.
							</span>
						</span>
					</label>
				</div>
			</fieldset>

			<div class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-[14rem] flex-1 flex-col gap-0.5 text-xs text-slate-700">
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
			</div>
		</form>
	</CreateProjectBar>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-4xl px-6 py-8">
			<p class="mb-6 text-slate-600">{data.description}</p>

			<div class="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<LibraryImageCarousel images={data.images} alt="Metro map template preview" />
			</div>

			<section class="rounded-xl border border-slate-200 bg-slate-50 p-6">
				<h2 class="text-lg font-semibold text-slate-900">Instructions</h2>
				<ul class="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600">
					<li>Choose OpenStreetMap or a blank white base before you create the project</li>
					<li>Draw transit lines and pick city styles (Boston MBTA, NYC Subway, Delhi, and more)</li>
					<li>Simplify to a schematic metro style (like the example above)</li>
					<li>Toggle geographic vs schematic view anytime in the editor</li>
					<li>Ask the AI assistant to zoom, draw, simplify, or undo</li>
					<li>Save and choose private, collaborator, or public sharing</li>
				</ul>
				<p class="mt-4 text-xs text-slate-500">
					Your project appears in the library Posts column after you save it in the editor.
				</p>
				<p class="mt-3 text-sm text-slate-600">
					Questions or feedback?
					<a href={data.forumHref} class="font-medium text-sky-700 hover:underline">
						Visit the community forum
					</a>
					for reviews, tips, and discussion (with upvotes).
				</p>
			</section>
		</div>
	</div>
</main>
