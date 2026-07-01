<script lang="ts">
	import AuthButton from '$lib/components/AuthButton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="mx-auto max-w-6xl px-6 py-10">
	{#if data.user}
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-slate-900">Planning Project Library</h1>
			<p class="mt-2 text-slate-600">
				Browse planning templates and your saved projects. Cards are placeholders for now.
			</p>
		</div>

		{#if data.userProjects.length > 0}
			<section class="mb-10">
				<h2 class="mb-4 text-lg font-semibold text-slate-800">Your projects</h2>
				<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.userProjects as project}
						<article
							class="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
						>
							<span
								class="mb-3 inline-block w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
							>
								{project.project_types?.name ?? 'Custom'}
							</span>
							<h3 class="text-lg font-semibold text-slate-900">{project.name}</h3>
							{#if project.description}
								<p class="mt-2 flex-1 text-sm text-slate-600">{project.description}</p>
							{/if}
							<p class="mt-4 text-xs text-slate-400">Coming soon</p>
						</article>
					{/each}
				</div>
			</section>
		{/if}

		<section>
			<h2 class="mb-4 text-lg font-semibold text-slate-800">Template library</h2>
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.planningProjects as project}
					<article
						class="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
					>
						<span
							class="mb-3 inline-block w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
						>
							Template: {project.template}
						</span>
						<h3 class="text-lg font-semibold text-slate-900">{project.title}</h3>
						<p class="mt-2 flex-1 text-sm text-slate-600">{project.description}</p>
						<p class="mt-4 text-xs text-slate-400">Coming soon</p>
					</article>
				{/each}
			</div>
		</section>
	{:else}
		<section class="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
			<h1 class="text-3xl font-bold text-slate-900">Infrastructure planning, simplified</h1>
			<p class="mt-4 text-slate-600">
				Sign in to access the planning project library and manage your infrastructure plans.
			</p>
			<div class="mt-8">
				<AuthButton mode="sign-in" variant="primary" />
			</div>
		</section>
	{/if}
</main>
