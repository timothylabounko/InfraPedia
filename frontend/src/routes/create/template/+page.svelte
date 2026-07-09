<script lang="ts">
	import PageColumnBand from '$lib/components/PageColumnBand.svelte';
	import { platformApis } from '$lib/data/platform-apis';
	import type { ActionData, PageData } from './$types';

	let { form }: { data: PageData; form: ActionData } = $props();

	let title = $state('');
	let description = $state('');
	let mapLibrary = $state<'leaflet' | 'mapbox'>('leaflet');
	let publishMode = $state<'metadata' | 'folder'>('metadata');
	let selectedApis = $state<string[]>(['osm-osmnx']);

	$effect(() => {
		const formTitle = (form as { title?: string } | null | undefined)?.title;
		if (formTitle) title = formTitle;
	});

	function toggleApi(id: string) {
		if (selectedApis.includes(id)) {
			selectedApis = selectedApis.filter((a) => a !== id);
		} else {
			selectedApis = [...selectedApis, id];
		}
	}
</script>

<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
	<PageColumnBand
		tone="blue"
		eyebrow="Create"
		title="New map template"
		subtitle="Publish a reusable map-based project folder"
	/>

	<div class="flex-1 overflow-y-auto bg-white p-6">
		<div class="mx-auto flex max-w-2xl flex-col gap-4">
			{#if form?.error}
				<p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
					{form.error}
				</p>
			{/if}

			<form method="POST" enctype="multipart/form-data" class="flex flex-col gap-4">
				<fieldset class="space-y-2">
					<legend class="text-xs font-semibold uppercase tracking-wide text-slate-600">
						Publish mode
					</legend>
					<div class="flex flex-wrap gap-4 text-sm text-slate-800">
						<label class="flex items-center gap-2">
							<input
								type="radio"
								name="publish_mode"
								value="metadata"
								checked={publishMode === 'metadata'}
								onchange={() => (publishMode = 'metadata')}
							/>
							Metadata only (catalog entry)
						</label>
						<label class="flex items-center gap-2">
							<input
								type="radio"
								name="publish_mode"
								value="folder"
								checked={publishMode === 'folder'}
								onchange={() => (publishMode = 'folder')}
							/>
							Upload template folder
						</label>
					</div>
				</fieldset>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1 text-xs text-slate-700">
						<span class="font-medium">Template title</span>
						<input
							name="title"
							required
							bind:value={title}
							class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
							placeholder="e.g. Flood risk mapper"
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs text-slate-700">
						<span class="font-medium">Map library</span>
						<select
							name="map_library"
							bind:value={mapLibrary}
							class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
						>
							<option value="leaflet">Leaflet (required)</option>
							<option value="mapbox">Mapbox GL</option>
						</select>
					</label>
				</div>

				<label class="flex flex-col gap-1 text-xs text-slate-700">
					<span class="font-medium">Description</span>
					<textarea
						name="description"
						rows="2"
						bind:value={description}
						class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
						placeholder="What map workflow does this template support?"
					></textarea>
				</label>

				{#if publishMode === 'folder'}
					<label class="flex flex-col gap-1 text-xs text-slate-700">
						<span class="font-medium">Template project folder</span>
						<input
							type="file"
							name="template_files"
							multiple
							webkitdirectory
							directory
							required={publishMode === 'folder'}
							class="rounded-md border border-dashed border-slate-300 bg-white px-2 py-2 text-sm"
						/>
						<span class="text-slate-500">
							Select a folder that includes your map app (must contain index.html with Leaflet or
							Mapbox).
						</span>
					</label>
				{/if}

				<fieldset class="space-y-2">
					<legend class="text-xs font-semibold uppercase tracking-wide text-slate-600">
						Required APIs
					</legend>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each platformApis as api (api.id)}
							<label
								class="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
							>
								<input
									type="checkbox"
									name="required_apis"
									value={api.id}
									checked={selectedApis.includes(api.id)}
									onchange={() => toggleApi(api.id)}
								/>
								<span>
									<span class="font-medium text-slate-900">{api.name}</span>
									<span class="mt-0.5 block text-slate-600">{api.description}</span>
								</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<button
					type="submit"
					class="self-start rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
				>
					Publish template
				</button>
			</form>

			<p class="text-sm text-slate-600">
				Upload an entire project folder to become the embedded map template, or publish metadata only
				to list a template in the catalog first.
			</p>
		</div>
	</div>
</main>
