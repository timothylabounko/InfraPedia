<script lang="ts">

	import CreateProjectBar from '$lib/components/metro/CreateProjectBar.svelte';

	import PageColumnBand from '$lib/components/PageColumnBand.svelte';

	import type { ActionData, PageData } from './$types';



	let { form }: { data: PageData; form: ActionData } = $props();



	let title = $state('');

	let description = $state('');



	$effect(() => {

		const formTitle = (form as { title?: string } | null | undefined)?.title;

		if (formTitle) title = formTitle;

	});

</script>



<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">

	<PageColumnBand

		tone="blue"

		eyebrow="Create"

		title="New forum"

		subtitle="Start a community discussion page"

	/>



	<CreateProjectBar error={form?.error ?? null} tone="white">

		<form method="POST" class="flex w-full flex-wrap items-end gap-3">

			<label class="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-slate-700">

				<span class="font-medium">Forum title</span>

				<input

					name="title"

					required

					bind:value={title}

					class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"

					placeholder="e.g. Schematic map tips"

				/>

			</label>

			<label class="flex min-w-[14rem] flex-[2] flex-col gap-1 text-xs text-slate-700">

				<span class="font-medium">Description</span>

				<input

					name="description"

					bind:value={description}

					class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"

					placeholder="What will people discuss here?"

				/>

			</label>

			<button

				type="submit"

				class="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"

			>

				Create forum

			</button>

		</form>

	</CreateProjectBar>



	<div class="flex-1 overflow-y-auto p-6">

		<p class="mx-auto max-w-2xl text-sm text-slate-600">

			Forums let signed-in users post reviews, tips, and questions with upvotes — like the template

			forums in the Posts column.

		</p>

	</div>

</main>

