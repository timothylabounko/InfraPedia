<script lang="ts">
	import {
		CURVATURE_OPTIONS,
		EDGE_TYPE_OPTIONS,
		LINE_COLOR_SWATCHES,
		LINE_STYLE_PRESETS,
		getLineStyle
	} from '$lib/metro/line-styles';
	import { LINE_WEIGHT_OPTIONS, STATION_ICON_PRESETS } from '$lib/metro/station-styles';
	import type { LineCurvature, LineEdgeType, StationIconId } from '$lib/metro/types';
	import { getStationIcon } from '$lib/metro/station-styles';

	type Props = {
		drawMode: boolean;
		stationMode: boolean;
		editLineMode: boolean;
		selectedLineId: string | null;
		drawColor: string;
		drawStyleId: string;
		drawWeight: number;
		drawCurvature: LineCurvature;
		drawEdgeType: LineEdgeType;
		drawSnapToStreets: boolean;
		stationIconId: StationIconId;
		stationName: string;
		snapEnabled: boolean;
		onDraw: () => void;
		onStopDraw: () => void;
		onStation: () => void;
		onStopStation: () => void;
		onColorChange: (c: string) => void;
		onStyleChange: (styleId: string) => void;
		onWeightChange: (w: number) => void;
		onCurvatureChange: (c: LineCurvature) => void;
		onEdgeTypeChange: (e: LineEdgeType) => void;
		onDrawSnapToStreetsChange: (enabled: boolean) => void;
		onEditLine: () => void;
		onStopEditLine: () => void;
		onStationIconChange: (id: StationIconId) => void;
		onStationNameChange: (name: string) => void;
		onSnapToggle: (enabled: boolean) => void;
		onBrowseStyles: () => void;
	};

	let {
		drawMode,
		stationMode,
		editLineMode,
		selectedLineId,
		drawColor,
		drawStyleId,
		drawWeight,
		drawCurvature,
		drawEdgeType,
		drawSnapToStreets,
		stationIconId,
		stationName,
		snapEnabled,
		onDraw,
		onStopDraw,
		onStation,
		onStopStation,
		onColorChange,
		onStyleChange,
		onWeightChange,
		onCurvatureChange,
		onEdgeTypeChange,
		onDrawSnapToStreetsChange,
		onEditLine,
		onStopEditLine,
		onStationIconChange,
		onStationNameChange,
		onSnapToggle,
		onBrowseStyles
	}: Props = $props();

	const preset = $derived(getLineStyle(drawStyleId));
	const previewIcons = $derived(STATION_ICON_PRESETS.slice(0, 8));
	let customColor = $state('#000000');

	$effect(() => {
		customColor = drawColor;
	});
</script>

<div class="space-y-3 text-sm">
	<label class="block">
		<select
			data-highlight-id="set_draw_style"
			class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm font-medium"
			value={drawStyleId}
			onchange={(e) => onStyleChange(e.currentTarget.value)}
		>
			{#each LINE_STYLE_PRESETS as p}
				<option value={p.id}>{p.name}</option>
			{/each}
		</select>
		{#if preset.description}
			<p class="mt-1 text-[10px] text-slate-500">{preset.description}</p>
		{/if}
	</label>

	<button
		type="button"
		data-highlight-id="browse_styles"
		class="h-9 w-full rounded-md border border-slate-300 bg-white text-xs font-medium hover:bg-slate-50"
		onclick={onBrowseStyles}
	>
		Browse all {LINE_STYLE_PRESETS.length} line &amp; {STATION_ICON_PRESETS.length} station styles
	</button>

	<div class="grid grid-cols-2 gap-2">
		{#if drawMode}
			<button
				type="button"
				data-highlight-id="disable_draw_mode"
				class="h-9 rounded-md border border-slate-300 bg-slate-100 text-xs"
				onclick={onStopDraw}
			>
				Stop line
			</button>
		{:else}
			<button
				type="button"
				data-highlight-id="enable_draw_mode"
				class="h-9 rounded-md border border-slate-900 bg-slate-900 text-xs font-medium text-white"
				onclick={onDraw}
			>
				Draw line
			</button>
		{/if}
		{#if stationMode}
			<button
				type="button"
				data-highlight-id="disable_station_mode"
				class="h-9 rounded-md border border-slate-300 bg-slate-100 text-xs"
				onclick={onStopStation}
			>
				Stop station
			</button>
		{:else}
			<button
				type="button"
				data-highlight-id="enable_station_mode"
				class="h-9 rounded-md border border-slate-800 bg-white text-xs font-medium"
				onclick={onStation}
			>
				Add station
			</button>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-2">
		<label class="block">
			<select
				class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
				value={drawWeight}
				onchange={(e) => onWeightChange(Number(e.currentTarget.value))}
			>
				{#each LINE_WEIGHT_OPTIONS as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<select
				class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
				value={drawCurvature}
				onchange={(e) => onCurvatureChange(e.currentTarget.value as LineCurvature)}
			>
				{#each CURVATURE_OPTIONS as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<select
		class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
		value={drawEdgeType}
		onchange={(e) => onEdgeTypeChange(e.currentTarget.value as LineEdgeType)}
	>
		{#each EDGE_TYPE_OPTIONS as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	<div>
		<div class="mb-1.5 flex flex-wrap items-center gap-1">
			{#each LINE_COLOR_SWATCHES as color}
				<button
					type="button"
					class="h-6 w-6 rounded-full border-2 {drawColor === color
						? 'border-slate-900'
						: 'border-white'} shadow-sm"
					style="background: {color}"
					aria-label="Color {color}"
					title={color}
					onclick={() => onColorChange(color)}
				></button>
			{/each}
		</div>
		<label class="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-2">
			<span class="shrink-0 text-xs text-slate-600">Custom</span>
			<input
				type="color"
				class="h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
				value={customColor}
				oninput={(e) => {
					customColor = e.currentTarget.value;
					onColorChange(e.currentTarget.value);
				}}
				aria-label="Pick custom color"
			/>
			<input
				type="text"
				class="min-w-0 flex-1 border-0 bg-transparent text-xs text-slate-700 focus:ring-0"
				value={customColor}
				maxlength={7}
				placeholder="#RRGGBB"
				oninput={(e) => {
					const v = e.currentTarget.value;
					customColor = v;
					if (/^#[0-9A-Fa-f]{6}$/.test(v)) onColorChange(v);
				}}
			/>
		</label>
	</div>

	<div>
		<div class="mb-1 flex items-center justify-between">
			<p class="text-[10px] font-medium text-slate-500">Station icon</p>
			<button type="button" class="text-[10px] text-slate-600 underline" onclick={onBrowseStyles}>
				All {STATION_ICON_PRESETS.length}
			</button>
		</div>
		<div class="grid grid-cols-4 gap-1">
			{#each previewIcons as icon}
				<button
					type="button"
					class="flex h-8 items-center justify-center rounded-md border {stationIconId === icon.id
						? 'border-slate-900 bg-slate-900'
						: 'border-slate-200 bg-white hover:bg-slate-50'}"
					aria-label={icon.name}
					title={icon.name}
					onclick={() => onStationIconChange(icon.id)}
				>
					<span class="station-icon-preview">{@html getStationIcon(icon.id).svg}</span>
				</button>
			{/each}
		</div>
		{#if stationIconId && !previewIcons.some((i) => i.id === stationIconId)}
			<p class="mt-1 text-[10px] text-slate-500">
				Selected: {getStationIcon(stationIconId).name}
			</p>
		{/if}
	</div>

	<input
		type="text"
		class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
		placeholder="Station name (optional)"
		value={stationName}
		oninput={(e) => onStationNameChange(e.currentTarget.value)}
	/>

	<div class="grid grid-cols-2 gap-2">
		{#if editLineMode}
			<button
				type="button"
				data-highlight-id="disable_edit_line_mode"
				class="col-span-2 h-9 rounded-md border border-sky-300 bg-sky-50 text-xs font-medium text-sky-900"
				onclick={onStopEditLine}
			>
				Stop editing lines
			</button>
		{:else}
			<button
				type="button"
				data-highlight-id="enable_edit_line_mode"
				class="col-span-2 h-9 rounded-md border border-sky-600 bg-sky-600 text-xs font-medium text-white"
				onclick={onEditLine}
			>
				Edit lines
			</button>
		{/if}
	</div>

	{#if editLineMode && selectedLineId}
		<p class="text-[10px] leading-snug text-slate-500">
			Click a line to select it. Click a segment to add a bend, drag to shape it, or click
			Click a corner point to curve between its two neighbours (−100 snakey to +100 rounded).
			Right-click for more options. Esc to deselect.
		</p>
	{:else}
		<p class="text-[10px] leading-snug text-slate-500">
			Click any line on the map to start editing — no need to press Edit lines first.
		</p>
	{/if}

	<label class="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
		<input
			type="checkbox"
			class="size-4 rounded"
			checked={drawSnapToStreets}
			onchange={(e) => onDrawSnapToStreetsChange(e.currentTarget.checked)}
		/>
		Snap new lines to streets
	</label>

	<label class="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
		<input
			type="checkbox"
			class="size-4 rounded"
			checked={snapEnabled}
			onchange={(e) => onSnapToggle(e.currentTarget.checked)}
		/>
		Snap to lines (Shift = free)
	</label>
</div>

<style>
	.station-icon-preview :global(svg) {
		display: block;
	}
	.station-icon-preview :global(svg path),
	.station-icon-preview :global(svg circle),
	.station-icon-preview :global(svg rect),
	.station-icon-preview :global(svg polygon),
	.station-icon-preview :global(svg line),
	.station-icon-preview :global(svg polyline) {
		pointer-events: none;
	}
</style>
