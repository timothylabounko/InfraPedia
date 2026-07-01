<script lang="ts">
	export type DockPanelId = 'style' | 'draw' | 'view' | 'legend' | null;

	type Props = {
		openPanel: DockPanelId;
		onOpenPanel: (id: DockPanelId) => void;
	};

	let { openPanel, onOpenPanel }: Props = $props();

	const tabs: { id: DockPanelId; label: string; highlightId: string }[] = [
		{ id: 'style', label: 'City style', highlightId: 'panel_style' },
		{ id: 'draw', label: 'Shapes', highlightId: 'panel_draw' },
		{ id: 'view', label: 'View', highlightId: 'panel_view' },
		{ id: 'legend', label: 'Legend', highlightId: 'panel_legend' }
	];
</script>

<div
	class="pointer-events-auto absolute left-3 top-3 z-[900] flex w-[7.25rem] flex-col gap-1.5"
	role="toolbar"
	aria-label="Map tools"
>
	{#each tabs as tab}
		<button
			type="button"
			data-highlight-id={tab.highlightId}
			class="h-8 w-full truncate rounded-md border px-2 text-xs font-medium transition {openPanel === tab.id
				? 'border-slate-900 bg-slate-900 text-white'
				: 'border-slate-200 bg-white/95 text-slate-700 shadow-sm hover:border-slate-400'}"
			onclick={() => onOpenPanel(openPanel === tab.id ? null : tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
