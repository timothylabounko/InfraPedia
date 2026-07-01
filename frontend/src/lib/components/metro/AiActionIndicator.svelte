<script lang="ts">
	type Props = {
		highlightId: string | null;
		label: string | null;
		mapBanner?: string | null;
	};

	let { highlightId, label, mapBanner = null }: Props = $props();

	let top = $state(0);
	let left = $state(0);
	let show = $state(false);

	$effect(() => {
		if (!highlightId || !label) {
			show = false;
			return;
		}

		if (highlightId === 'set_map_view') {
			show = true;
			top = 80;
			left = window.innerWidth / 2;
			return;
		}

		const el = document.querySelector(`[data-highlight-id="${highlightId}"]`) as HTMLElement | null;
		if (!el) {
			show = true;
			top = 72;
			left = window.innerWidth / 2;
			return;
		}

		el.classList.add('ai-highlight-active');
		const rect = el.getBoundingClientRect();
		top = rect.top;
		left = rect.left + rect.width / 2;
		show = true;

		return () => {
			el.classList.remove('ai-highlight-active');
		};
	});
</script>

{#if show && label}
	<div
		class="pointer-events-none fixed z-[2000] max-w-xs rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg"
		style="top: {top}px; left: {left}px; transform: translate(-50%, -100%) translateY(-8px);"
		role="status"
	>
		<span class="mr-1 opacity-70">AI →</span>
		{label}
		<div
			class="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-slate-900"
		></div>
	</div>
{/if}

{#if mapBanner}
	<div
		class="pointer-events-none absolute left-1/2 top-14 z-[2000] -translate-x-1/2 rounded-md border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
		role="status"
	>
		{mapBanner}
	</div>
{/if}

<style>
	:global(.ai-highlight-active) {
		outline: 2px solid #0f172a !important;
		outline-offset: 2px;
		box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.15) !important;
	}
</style>
