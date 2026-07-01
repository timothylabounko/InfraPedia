<script lang="ts">
	import AuthButton from '$lib/components/AuthButton.svelte';
	import LibraryBox from '$lib/components/LibraryBox.svelte';
	import LibraryColumn from '$lib/components/LibraryColumn.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

{#if data.user}
	<main class="library-shell grid w-full grid-cols-3 overflow-hidden">
		<LibraryColumn title="Templates" tone="red">
			{#each data.templates as template}
				<LibraryBox
					title={template.title}
					description={template.description}
					subtitle={template.template}
					href={template.previewHref ?? (template.slug ? `/projects/new/${template.slug}` : undefined)}
					comingSoon={!template.slug}
					images={template.images ?? []}
					openLabel="Open template"
				/>
			{/each}
		</LibraryColumn>

		<LibraryColumn title="Projects" tone="yellow">
			{#if data.projects.length === 0}
				<p class="rounded-lg border border-dashed border-black/20 p-4 text-center text-sm text-slate-600">
					No saved projects yet. Open a template to create one.
				</p>
			{/if}
			{#each data.projects as project}
				<LibraryBox
					title={project.name}
					description={`By ${project.creatorName || project.creatorEmail}`}
					subtitle={project.project_types?.name ?? 'Project'}
					href={project.project_types?.slug === 'metro-map' ? `/projects/${project.id}` : undefined}
					comingSoon={project.project_types?.slug !== 'metro-map'}
					images={project.images}
					openLabel="Open project"
				/>
			{/each}
		</LibraryColumn>

		<LibraryColumn title="Create" tone="blue">
			{#each data.createActions as action}
				<LibraryBox
					title={action.title}
					description={action.description}
					subtitle={action.kind}
					images={[]}
				/>
			{/each}
		</LibraryColumn>
	</main>
{:else}
	<main class="flex-1 overflow-y-auto">
		<div class="mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
			<h1 class="text-3xl font-bold text-slate-900">Infrastructure planning, simplified</h1>
			<p class="mt-4 text-slate-600">
				Sign in to access the planning project library and manage your infrastructure plans.
			</p>
			<div class="mt-8">
				<AuthButton mode="sign-in" variant="primary" />
			</div>
		</div>
	</main>
{/if}
