<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
	{@render children()}
</div>
