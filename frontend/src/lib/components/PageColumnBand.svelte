<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import type { Snippet } from 'svelte';

	type Tone = 'red' | 'yellow' | 'blue';

	type Props = {
		tone: Tone;
		eyebrow: string;
		title: string;
		subtitle?: string;
		actions?: Snippet;
	};

	let { tone, eyebrow, title, subtitle, actions }: Props = $props();

	const bandClass = $derived(
		tone === 'red' ? 'bg-red-100' : tone === 'yellow' ? 'bg-yellow-100' : 'bg-blue-100'
	);
</script>

<div
	class="flex shrink-0 flex-wrap items-center gap-3 border-b border-black/10 px-4 py-2.5 {bandClass}"
>
	<BackButton href="/" label="Back to library" showArrow={false} />
	<div class="min-w-0 flex-1">
		<p class="text-xs font-semibold uppercase tracking-wide text-slate-600">{eyebrow}</p>
		<h1 class="truncate text-lg font-bold text-slate-900">{title}</h1>
		{#if subtitle}
			<p class="truncate text-xs text-slate-600">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
