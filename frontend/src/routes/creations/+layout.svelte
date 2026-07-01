<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
	{@render children()}
</div>
