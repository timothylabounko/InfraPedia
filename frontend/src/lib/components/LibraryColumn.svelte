<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		tone: 'red' | 'yellow' | 'blue';
		children: Snippet;
	};

	let { title, tone, children }: Props = $props();

	const toneClass = $derived(
		{
			red: 'bg-red-100',
			yellow: 'bg-yellow-100',
			blue: 'bg-blue-100'
		}[tone]
	);
</script>

<section class="library-column flex h-full min-h-0 min-w-0 flex-col overflow-hidden {toneClass}">
	<div class="shrink-0 border-b border-black/10 px-4 py-3 text-center">
		<h2 class="text-base font-semibold tracking-wide text-slate-900 uppercase">{title}</h2>
	</div>
	<div class="library-column-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
		{@render children()}
	</div>
</section>
