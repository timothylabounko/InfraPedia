<script lang="ts">
	import type { MapLegendSettings } from '$lib/metro/types';
	import { newLineId } from '$lib/metro/simplify';

	type Props = {
		legend: MapLegendSettings;
		lineColors: string[];
		onChange: (legend: MapLegendSettings) => void;
	};

	let { legend, lineColors, onChange }: Props = $props();

	let newLabel = $state('');
	let newColor = $state('#DA291C');
	let logoUrl = $state('');

	function addItem() {
		if (!newLabel.trim()) return;
		onChange({
			...legend,
			items: [
				...legend.items,
				{ id: newLineId(), color: newColor, label: newLabel.trim(), logoUrl: logoUrl || undefined }
			]
		});
		newLabel = '';
		logoUrl = '';
	}

	function removeItem(id: string) {
		onChange({ ...legend, items: legend.items.filter((i) => i.id !== id) });
	}

	function syncFromLines() {
		const items = lineColors.map((color, i) => ({
			id: newLineId(),
			color,
			label: `Line ${i + 1}`
		}));
		onChange({ ...legend, items });
	}
</script>

<div class="space-y-3 text-sm">
	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">Legend title</span>
		<input
			type="text"
			class="h-9 w-full rounded-md border border-slate-200 px-2"
			value={legend.title}
			oninput={(e) => onChange({ ...legend, title: e.currentTarget.value })}
		/>
	</label>

	<div class="flex flex-wrap gap-3">
		<label class="flex items-center gap-2 text-xs">
			<input
				type="checkbox"
				checked={legend.showScaleBar}
				onchange={(e) => onChange({ ...legend, showScaleBar: e.currentTarget.checked })}
			/>
			Scale bar
		</label>
		<label class="flex items-center gap-2 text-xs">
			<input
				type="checkbox"
				checked={legend.showNorthArrow}
				onchange={(e) => onChange({ ...legend, showNorthArrow: e.currentTarget.checked })}
			/>
			North arrow
		</label>
	</div>

	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">Position</span>
		<select
			class="h-9 w-full rounded-md border border-slate-200 px-2"
			value={legend.position}
			onchange={(e) =>
				onChange({
					...legend,
					position: e.currentTarget.value as MapLegendSettings['position']
				})}
		>
			<option value="bottom-left">Bottom left</option>
			<option value="bottom-right">Bottom right</option>
			<option value="top-left">Top left</option>
			<option value="top-right">Top right</option>
		</select>
	</label>

	<button
		type="button"
		class="h-8 w-full rounded-md border border-slate-200 text-xs hover:bg-slate-50"
		onclick={syncFromLines}
	>
		Auto-fill from line colors
	</button>

	<ul class="max-h-32 space-y-1 overflow-y-auto">
		{#each legend.items as item (item.id)}
			<li class="flex items-center gap-2 rounded border border-slate-100 px-2 py-1 text-xs">
				<span class="h-1 w-5 shrink-0 rounded-sm" style="background:{item.color}"></span>
				<span class="min-w-0 flex-1 truncate">{item.label}</span>
				<button type="button" class="text-slate-400 hover:text-red-600" onclick={() => removeItem(item.id)}
					>✕</button
				>
			</li>
		{/each}
	</ul>

	<div class="space-y-2 border-t border-slate-100 pt-2">
		<input
			type="text"
			class="h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
			placeholder="New legend label"
			bind:value={newLabel}
		/>
		<div class="flex gap-2">
			<input type="color" class="h-8 w-10 rounded border border-slate-200" bind:value={newColor} />
			<input
				type="url"
				class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-xs"
				placeholder="Logo URL (optional)"
				bind:value={logoUrl}
			/>
		</div>
		<button
			type="button"
			class="h-8 w-full rounded-md border border-slate-900 bg-slate-900 text-xs text-white"
			onclick={addItem}
		>
			Add legend item
		</button>
	</div>
</div>
