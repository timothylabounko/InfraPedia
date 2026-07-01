<script lang="ts">
	import {
		CURVATURE_OPTIONS,
		EDGE_TYPE_OPTIONS,
		LINE_COLOR_SWATCHES,
		LINE_STYLE_PRESETS,
		getLineStyle
	} from '$lib/metro/line-styles';
	import { LINE_WEIGHT_OPTIONS } from '$lib/metro/station-styles';
	import type { LineCurvature, LineEdgeType } from '$lib/metro/types';

	type Props = {
		drawMode: boolean;
		drawColor: string;
		drawStyleId: string;
		drawWeight: number;
		drawCurvature: LineCurvature;
		drawEdgeType: LineEdgeType;
		onDraw: () => void;
		onStopDraw: () => void;
		onColorChange: (c: string) => void;
		onStyleChange: (id: string) => void;
		onWeightChange: (w: number) => void;
		onCurvatureChange: (c: LineCurvature) => void;
		onEdgeTypeChange: (e: LineEdgeType) => void;
	};

	let {
		drawMode,
		drawColor,
		drawStyleId,
		drawWeight,
		drawCurvature,
		drawEdgeType,
		onDraw,
		onStopDraw,
		onColorChange,
		onStyleChange,
		onWeightChange,
		onCurvatureChange,
		onEdgeTypeChange
	}: Props = $props();

	const preset = $derived(getLineStyle(drawStyleId));
</script>

<div class="space-y-3 text-sm">
	{#if drawMode}
		<button
			type="button"
			data-highlight-id="disable_draw_mode"
			class="h-9 w-full rounded-md border border-slate-300 bg-slate-100 text-sm"
			onclick={onStopDraw}
		>
			Stop drawing
		</button>
	{:else}
		<button
			type="button"
			data-highlight-id="enable_draw_mode"
			class="h-9 w-full rounded-md border border-slate-900 bg-slate-900 text-sm font-medium text-white"
			onclick={onDraw}
		>
			Draw a new line
		</button>
	{/if}

	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">City map style</span>
		<select
			data-highlight-id="set_draw_style"
			class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
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

	<div class="grid grid-cols-2 gap-2">
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Thickness</span>
			<select
				class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
				value={drawWeight}
				onchange={(e) => onWeightChange(Number(e.currentTarget.value))}
			>
				{#each LINE_WEIGHT_OPTIONS as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Curvature</span>
			<select
				class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
				value={drawCurvature}
				onchange={(e) => onCurvatureChange(e.currentTarget.value as LineCurvature)}
			>
				{#each CURVATURE_OPTIONS as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">Corner / edge type</span>
		<select
			class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
			value={drawEdgeType}
			onchange={(e) => onEdgeTypeChange(e.currentTarget.value as LineEdgeType)}
		>
			{#each EDGE_TYPE_OPTIONS as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	</label>

	<div>
		<span class="mb-1 block text-xs font-medium text-slate-600">Color</span>
		<div class="flex flex-wrap gap-1.5">
			{#each LINE_COLOR_SWATCHES as color}
				<button
					type="button"
					class="h-7 w-7 rounded-full border-2 {drawColor === color
						? 'border-slate-900'
						: 'border-white'} shadow-sm"
					style="background: {color}"
					onclick={() => onColorChange(color)}
				></button>
			{/each}
		</div>
	</div>

	<div class="rounded border border-slate-100 bg-slate-50 p-2">
		<span class="mb-1 block text-[10px] font-medium text-slate-500">Preview</span>
		<div class="flex h-8 items-center">
			{#if preset.casingColor}
				<div
					class="h-2 rounded-sm"
					style="width: 5rem; background: {preset.casingColor}; box-shadow: inset 0 0 0 {preset.casingExtra ?? 2}px {drawColor}"
				></div>
			{:else}
				<div class="rounded-sm" style="width: 5rem; height: {drawWeight}px; background: {drawColor}"></div>
			{/if}
		</div>
	</div>
</div>
