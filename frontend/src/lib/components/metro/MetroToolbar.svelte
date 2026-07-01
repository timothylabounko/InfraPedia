<script lang="ts">
	import {
		DEFAULT_LINE_STYLE_ID,
		LINE_COLOR_SWATCHES,
		LINE_STYLE_PRESETS,
		getLineStyle
	} from '$lib/metro/line-styles';
	import {
		DEFAULT_STATION_ICON_ID,
		LINE_WEIGHT_OPTIONS,
		STATION_ICON_PRESETS
	} from '$lib/metro/station-styles';
	import type { StationIconId } from '$lib/metro/types';

	type Props = {
		activeButton: string | null;
		drawMode: boolean;
		stationMode: boolean;
		viewMode: 'geographic' | 'schematic';
		mapSource: 'osm' | 'scratch';
		drawColor: string;
		drawStyleId: string;
		drawWeight: number;
		stationIconId: StationIconId;
		canUndo: boolean;
		onDraw: () => void;
		onStopDraw: () => void;
		onStation: () => void;
		onStopStation: () => void;
		onColorChange: (color: string) => void;
		onStyleChange: (styleId: string) => void;
		onWeightChange: (weight: number) => void;
		onStationIconChange: (iconId: StationIconId) => void;
		onSimplify: () => void;
		onGeographic: () => void;
		onSchematic: () => void;
		onOsm: () => void;
		onScratch: () => void;
		onUndo: () => void;
		onClear: () => void;
		onClearStations: () => void;
	};

	let {
		activeButton,
		drawMode,
		stationMode,
		viewMode,
		mapSource,
		drawColor,
		drawStyleId,
		drawWeight,
		stationIconId,
		canUndo,
		onDraw,
		onStopDraw,
		onStation,
		onStopStation,
		onColorChange,
		onStyleChange,
		onWeightChange,
		onStationIconChange,
		onSimplify,
		onGeographic,
		onSchematic,
		onOsm,
		onScratch,
		onUndo,
		onClear,
		onClearStations
	}: Props = $props();

	const currentStyle = $derived(getLineStyle(drawStyleId));

	function hl(id: string, base = 'rounded-md border bg-white/80 px-2 py-1.5 text-sm text-slate-700') {
		const active = activeButton === id;
		return `${base} ${active ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-1 animate-pulse' : 'border-slate-300'}`;
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Lines -->
	<div class="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300/60 bg-white/50 px-2 py-1">
		{#if drawMode}
			<button type="button" class={hl('disable_draw_mode')} onclick={onStopDraw}>Stop drawing</button>
		{:else}
			<button type="button" class={hl('enable_draw_mode')} onclick={onDraw}>Draw a new line</button>
		{/if}

		<select
			class={hl('set_draw_style', 'max-w-[8.5rem] rounded-md border bg-white/80 px-1.5 py-1 text-xs')}
			value={drawStyleId}
			onchange={(e) => onStyleChange(e.currentTarget.value)}
			title="Line style preset"
		>
			{#each LINE_STYLE_PRESETS as preset}
				<option value={preset.id}>{preset.name}</option>
			{/each}
		</select>

		<select
			class="rounded-md border border-slate-300 bg-white/80 px-1.5 py-1 text-xs"
			value={drawWeight}
			onchange={(e) => onWeightChange(Number(e.currentTarget.value))}
			title="Line thickness"
		>
			{#each LINE_WEIGHT_OPTIONS as opt}
				<option value={opt.value}>{opt.label} ({opt.value}px)</option>
			{/each}
		</select>

		<div class="flex items-center gap-0.5" title="Line color">
			{#each LINE_COLOR_SWATCHES as color}
				<button
					type="button"
					class="h-5 w-5 rounded-full border-2 {drawColor === color
						? 'border-slate-900 scale-110'
						: 'border-white'} shadow-sm transition-transform"
					style="background-color: {color}"
					aria-label="Color {color}"
					onclick={() => onColorChange(color)}
				></button>
			{/each}
		</div>

		<span
			class="hidden h-1 w-10 rounded sm:inline-block"
			style="background: {drawColor}; height: {Math.max(drawWeight, currentStyle.weight)}px"
			title="Line preview"
		></span>
	</div>

	<!-- Stations -->
	<div class="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300/60 bg-white/50 px-2 py-1">
		{#if stationMode}
			<button type="button" class={hl('disable_station_mode')} onclick={onStopStation}>
				Stop stations
			</button>
		{:else}
			<button type="button" class={hl('enable_station_mode')} onclick={onStation}>Add station</button>
		{/if}

		<select
			class="rounded-md border border-slate-300 bg-white/80 px-1.5 py-1 text-xs"
			value={stationIconId}
			onchange={(e) => onStationIconChange(e.currentTarget.value as StationIconId)}
			title="Station icon"
		>
			{#each STATION_ICON_PRESETS as icon}
				<option value={icon.id}>{icon.name}</option>
			{/each}
		</select>
	</div>

	<!-- View -->
	<label class="flex items-center gap-1 text-xs text-slate-700">
		<span>View</span>
		<select
			class={hl(`set_view_mode_${viewMode}`, 'rounded-md border bg-white/80 px-2 py-1.5 text-sm')}
			value={viewMode}
			disabled={mapSource === 'scratch'}
			onchange={(e) => {
				const v = e.currentTarget.value;
				if (v === 'geographic') onGeographic();
				else onSchematic();
			}}
		>
			<option value="geographic" disabled={mapSource === 'scratch'}>Geographic</option>
			<option value="schematic">Schematic</option>
		</select>
	</label>

	<!-- Base -->
	<label class="flex items-center gap-1 text-xs text-slate-700">
		<span>Base</span>
		<select
			class={hl(`set_map_source_${mapSource}`, 'rounded-md border bg-white/80 px-2 py-1.5 text-sm')}
			value={mapSource}
			onchange={(e) => {
				if (e.currentTarget.value === 'osm') onOsm();
				else onScratch();
			}}
		>
			<option value="osm">OSM map</option>
			<option value="scratch">Blank grid</option>
		</select>
	</label>

	<!-- Actions -->
	<label class="flex items-center gap-1 text-xs text-slate-700">
		<span>Actions</span>
		<select
			id="actions-menu"
			class="rounded-md border border-slate-300 bg-white/80 px-2 py-1.5 text-sm"
			onchange={(e) => {
				const action = e.currentTarget.value;
				e.currentTarget.value = '';
				if (action === 'simplify') onSimplify();
				else if (action === 'undo' && canUndo) onUndo();
				else if (action === 'clear') onClear();
				else if (action === 'clear_stations') onClearStations();
			}}
		>
			<option value="">Choose…</option>
			<option value="simplify">Simplify map</option>
			<option value="undo" disabled={!canUndo}>Undo</option>
			<option value="clear">Clear all lines</option>
			<option value="clear_stations">Clear all stations</option>
		</select>
	</label>

	<button
		type="button"
		class={hl('simplify_map', 'rounded-md border bg-white/80 px-2 py-1.5 text-xs text-slate-700')}
		onclick={onSimplify}
	>
		Simplify
	</button>
</div>
