<script lang="ts">
	type Props = {
		viewMode: 'geographic' | 'schematic';
		mapSource: 'osm' | 'scratch';
		canUndo: boolean;
		onGeographic: () => void;
		onSchematic: () => void;
		onOsm: () => void;
		onScratch: () => void;
		onSimplify: () => void;
		onUndo: () => void;
		onClear: () => void;
		onClearStations: () => void;
	};

	let {
		viewMode,
		mapSource,
		canUndo,
		onGeographic,
		onSchematic,
		onOsm,
		onScratch,
		onSimplify,
		onUndo,
		onClear,
		onClearStations
	}: Props = $props();
</script>

<div class="space-y-3 text-sm">
	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">View</span>
		<select
			data-highlight-id={`set_view_mode_${viewMode}`}
			class="h-9 w-full rounded-md border border-slate-200 px-2"
			value={viewMode}
			disabled={mapSource === 'scratch'}
			onchange={(e) => {
				if (e.currentTarget.value === 'geographic') onGeographic();
				else onSchematic();
			}}
		>
			<option value="geographic">Geographic</option>
			<option value="schematic">Schematic (white + landcover)</option>
		</select>
	</label>

	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">Map base</span>
		<select
			data-highlight-id={`set_map_source_${mapSource}`}
			class="h-9 w-full rounded-md border border-slate-200 px-2"
			value={mapSource}
			onchange={(e) => {
				if (e.currentTarget.value === 'osm') onOsm();
				else onScratch();
			}}
		>
			<option value="osm">OpenStreetMap</option>
			<option value="scratch">Blank grid</option>
		</select>
	</label>

	<button
		type="button"
		data-highlight-id="simplify_map"
		class="h-9 w-full rounded-md border border-slate-300 text-sm hover:bg-slate-50"
		onclick={onSimplify}
	>
		Simplify map
	</button>

	<div class="grid grid-cols-2 gap-2">
		<button
			type="button"
			data-highlight-id="undo"
			class="h-9 rounded-md border border-slate-200 text-xs disabled:opacity-40"
			disabled={!canUndo}
			onclick={onUndo}
		>
			Undo
		</button>
		<button
			type="button"
			data-highlight-id="clear_lines"
			class="h-9 rounded-md border border-slate-200 text-xs hover:bg-red-50"
			onclick={onClear}
		>
			Clear lines
		</button>
		<button
			type="button"
			data-highlight-id="clear_stations"
			class="col-span-2 h-9 rounded-md border border-slate-200 text-xs"
			onclick={onClearStations}
		>
			Clear stations
		</button>
	</div>
</div>
