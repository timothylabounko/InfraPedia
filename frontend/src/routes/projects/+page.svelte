<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<main class="mx-auto max-w-3xl px-6 py-10">
	<header class="mb-8">
		<BackButton />
		<h1 class="mt-4 text-2xl font-bold text-slate-900">Create a project</h1>
		<p class="mt-1 text-sm text-slate-600">Add a new project to your library.</p>
	</header>

	<section class="mb-8 rounded-lg border border-gray-200 p-6">
		<h2 class="mb-4 text-lg font-semibold">Create a project</h2>

		{#if form?.error}
			<p class="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}

		<form method="POST" action="?/create" use:enhance class="space-y-4">
			<div>
				<label class="mb-1 block text-sm font-medium" for="name">Name</label>
				<input
					id="name"
					name="name"
					required
					class="w-full rounded border border-gray-300 px-3 py-2"
					placeholder="My infrastructure project"
				/>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium" for="description">Description</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					class="w-full rounded border border-gray-300 px-3 py-2"
					placeholder="Optional description"
				></textarea>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium" for="project_type_id">Project type</label>
				<select
					id="project_type_id"
					name="project_type_id"
					required
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value="">Select a type</option>
					{#each data.projectTypes as type}
						<option value={type.id}>{type.name}</option>
					{/each}
				</select>
			</div>

			<button
				type="submit"
				class="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
			>
				Create project
			</button>
		</form>
	</section>

	{#if data.projects.length === 0}
		<p class="rounded-lg border border-dashed border-gray-300 p-6 text-gray-600">
			No projects yet. Create your first one above.
		</p>
	{:else}
		<ul class="space-y-4">
			{#each data.projects as project}
				<li class="rounded-lg border border-gray-200 p-4">
					<h2 class="font-semibold">{project.name}</h2>
					{#if project.description}
						<p class="mt-1 text-sm text-gray-600">{project.description}</p>
					{/if}
					<p class="mt-2 text-xs text-gray-500">
						{project.project_types?.name ?? 'Unknown type'} · {project.status}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</main>
