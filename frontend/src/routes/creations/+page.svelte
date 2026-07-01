<script lang="ts">
	import LibraryBox from '$lib/components/LibraryBox.svelte';
	import ProjectCoverModal from '$lib/components/ProjectCoverModal.svelte';
	import { visibilityLabel, visibilityTheme } from '$lib/utils/project-visibility';
	import type { LibraryProject } from '$lib/types/library';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let projects = $state<LibraryProject[]>([...data.projects]);
	let deleting = $state(false);
	let selectMode = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
	let coverProject = $state<LibraryProject | null>(null);

	const selectedCount = $derived(selectedIds.size);
	const allSelected = $derived(
		projects.length > 0 && projects.every((p) => selectedIds.has(p.id))
	);

	function toggleSelectMode() {
		selectMode = !selectMode;
		if (!selectMode) selectedIds = new Set();
	}

	function toggleProject(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(projects.map((p) => p.id));
		}
	}

	function updateProjectImages(id: string, images: string[]) {
		projects = projects.map((p) => (p.id === id ? { ...p, images } : p));
	}

	async function deleteProjects(ids: string[]) {
		if (ids.length === 0) return;

		const names = projects
			.filter((p) => ids.includes(p.id))
			.map((p) => p.name)
			.slice(0, 3);
		const namePreview =
			names.length === 1
				? `"${names[0]}"`
				: ids.length <= 3
					? names.map((n) => `"${n}"`).join(', ')
					: `${ids.length} projects`;

		const confirmed = confirm(
			`Delete ${namePreview}? This cannot be undone and will remove all project data.`
		);
		if (!confirmed) return;

		deleting = true;
		const failed: string[] = [];

		try {
			const results = await Promise.all(
				ids.map(async (id) => {
					const res = await fetch(`/projects/${id}/delete`, { method: 'DELETE' });
					if (!res.ok) {
						const body = await res.json().catch(() => ({}));
						failed.push(body.error ?? id);
						return false;
					}
					return true;
				})
			);

			const deleted = ids.filter((_, i) => results[i]);
			projects = projects.filter((p) => !deleted.includes(p.id));
			selectedIds = new Set([...selectedIds].filter((id) => !deleted.includes(id)));

			if (failed.length > 0) {
				alert(`Could not delete ${failed.length} project(s).`);
			}

			if (projects.length === 0 || selectedIds.size === 0) {
				selectMode = false;
				selectedIds = new Set();
			}
		} catch {
			alert('Could not delete projects');
		} finally {
			deleting = false;
		}
	}

	function deleteSelected() {
		void deleteProjects([...selectedIds]);
	}
</script>

<main class="library-shell min-h-0 flex-1 overflow-y-auto bg-white">
	<div class="border-b border-slate-200 bg-white px-4 py-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-base font-semibold uppercase tracking-wide text-slate-900">My creations</h1>
				<p class="mt-0.5 text-xs text-slate-600">
					Dark = private · Grey = collaborators · Light = public · Save a project to capture its map
					as the cover
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if selectMode}
					<button
						type="button"
						class="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
						onclick={toggleSelectAll}
						disabled={deleting || projects.length === 0}
					>
						{allSelected ? 'Deselect all' : 'Select all'}
					</button>
					<button
						type="button"
						class="h-9 rounded-md border border-red-300 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
						onclick={deleteSelected}
						disabled={deleting || selectedCount === 0}
					>
						{deleting ? 'Deleting…' : `Delete selected (${selectedCount})`}
					</button>
					<button
						type="button"
						class="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
						onclick={toggleSelectMode}
						disabled={deleting}
					>
						Cancel
					</button>
				{:else}
					<button
						type="button"
						class="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						onclick={toggleSelectMode}
						disabled={projects.length === 0}
					>
						Select
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if projects.length === 0}
		<div class="flex flex-1 items-center justify-center p-6">
			<div class="w-full max-w-md rounded-xl border border-dashed border-slate-300 px-6 py-16 text-center">
				<p class="text-sm text-slate-600">No projects yet.</p>
				<a
					href="/"
					class="mt-4 inline-block rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
				>
					Browse templates
				</a>
			</div>
		</div>
	{:else}
		<div class="library-column-scroll grid w-full grid-cols-3 gap-3 p-3">
			{#each projects as project (project.id)}
				<LibraryBox
					title={project.name}
					description={project.project_types?.name ?? 'Project'}
					theme={visibilityTheme(project.visibility)}
					visibilityLabel={visibilityLabel(project.visibility)}
					href={selectMode
						? undefined
						: project.project_types?.slug === 'metro-map'
							? `/projects/${project.id}`
							: undefined}
					comingSoon={!selectMode && project.project_types?.slug !== 'metro-map'}
					images={project.images}
					openLabel="Open project"
					selectable={selectMode}
					selected={selectedIds.has(project.id)}
					onToggleSelect={() => toggleProject(project.id)}
					canEditCover={!selectMode}
					onEditCover={() => (coverProject = project)}
					canDelete={!selectMode && project.isOwner}
					{deleting}
					onDelete={() => deleteProjects([project.id])}
				/>
			{/each}
		</div>
	{/if}
</main>

{#if coverProject}
	<ProjectCoverModal
		open={!!coverProject}
		projectId={coverProject.id}
		projectName={coverProject.name}
		currentImage={coverProject.images[0] ?? null}
		onClose={() => (coverProject = null)}
		onSaved={(images) => {
			if (coverProject) updateProjectImages(coverProject.id, images);
			coverProject = null;
		}}
	/>
{/if}
