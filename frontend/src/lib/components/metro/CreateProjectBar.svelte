<script lang="ts">
	type Props = {
		error?: string | null;
		children?: import('svelte').Snippet;
	};

	let { error = null, children }: Props = $props();
</script>

<div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-black/10 bg-red-100 px-4 py-2.5">
	<span class="text-xs font-semibold uppercase tracking-wide text-slate-700">Create new project</span>
	{#if children}
		{@render children()}
	{/if}
	{#if error}
		<span class="text-sm text-red-800">{error}</span>
	{/if}
</div>
