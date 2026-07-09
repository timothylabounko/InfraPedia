<script lang="ts">
	type Props = {
		error?: string | null;
		tone?: 'red' | 'white';
		children?: import('svelte').Snippet;
	};

	let { error = null, tone = 'red', children }: Props = $props();

	const barClass = $derived(tone === 'white' ? 'bg-white' : 'bg-red-100');
</script>

<div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-black/10 px-4 py-2.5 {barClass}">
	<span class="text-xs font-semibold uppercase tracking-wide text-slate-700">Create new project</span>
	{#if children}
		{@render children()}
	{/if}
	{#if error}
		<span class="text-sm text-red-800">{error}</span>
	{/if}
</div>
