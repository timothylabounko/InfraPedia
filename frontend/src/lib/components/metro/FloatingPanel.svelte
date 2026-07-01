<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		open: boolean;
		onClose: () => void;
		children: Snippet;
		width?: string;
		/** px from left — clears vertical dock */
		left?: string;
	};

	let { title, open, onClose, children, width = '17rem', left = '8.75rem' }: Props = $props();
</script>

{#if open}
	<div
		class="pointer-events-auto absolute z-[1000] max-h-[min(28rem,calc(100%-5rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
		style="width: {width}; left: {left}; top: 0.75rem;"
		role="dialog"
		aria-label={title}
	>
		<div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
			<h3 class="text-sm font-semibold text-slate-900">{title}</h3>
			<button
				type="button"
				class="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
				onclick={onClose}
				aria-label="Close"
			>
				✕
			</button>
		</div>
		<div class="p-3">{@render children()}</div>
	</div>
{/if}
