<script lang="ts">
	import type { PolygonShapeType } from '$lib/metro/types';

	type Props = {
		polygonMode: boolean;
		polygonShape: PolygonShapeType;
		polygonFill: string;
		onStartPolygon: (shape: PolygonShapeType) => void;
		onStopPolygon: () => void;
		onShapeChange: (shape: PolygonShapeType) => void;
		onFillChange: (color: string) => void;
		onClearPolygons: () => void;
	};

	let {
		polygonMode,
		polygonShape,
		polygonFill,
		onStartPolygon,
		onStopPolygon,
		onShapeChange,
		onFillChange,
		onClearPolygons
	}: Props = $props();

	const shapes: { id: PolygonShapeType; label: string }[] = [
		{ id: 'rectangle', label: 'Rectangle' },
		{ id: 'ellipse', label: 'Ellipse' },
		{ id: 'polygon', label: 'Free polygon' }
	];
</script>

<div class="space-y-3 text-sm">
	<p class="text-[10px] text-slate-500">Click corners on the map; double-click to finish.</p>

	<div class="grid grid-cols-1 gap-1.5">
		{#each shapes as shape}
			<button
				type="button"
				data-highlight-id="draw_polygon_{shape.id}"
				class="h-9 rounded-md border text-xs font-medium {polygonMode && polygonShape === shape.id
					? 'border-slate-900 bg-slate-900 text-white'
					: 'border-slate-200 bg-white hover:bg-slate-50'}"
				onclick={() => {
					onShapeChange(shape.id);
					onStartPolygon(shape.id);
				}}
			>
				{shape.label}
			</button>
		{/each}
	</div>

	{#if polygonMode}
		<button
			type="button"
			class="h-9 w-full rounded-md border border-slate-300 bg-slate-100 text-xs"
			onclick={onStopPolygon}
		>
			Stop drawing shape
		</button>
	{/if}

	<label class="flex flex-col gap-1.5">
		<span class="text-xs text-slate-600">Fill color</span>
		<div class="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-2">
			<input
				type="color"
				class="h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
				value={polygonFill}
				oninput={(e) => onFillChange(e.currentTarget.value)}
				aria-label="Pick fill color"
			/>
			<input
				type="text"
				class="min-w-0 flex-1 border-0 bg-transparent text-xs text-slate-700 focus:ring-0"
				value={polygonFill}
				maxlength={7}
				placeholder="#RRGGBB"
				oninput={(e) => {
					const v = e.currentTarget.value;
					if (/^#[0-9A-Fa-f]{6}$/.test(v)) onFillChange(v);
				}}
			/>
		</div>
	</label>

	<button
		type="button"
		class="h-9 w-full rounded-md border border-slate-200 text-xs hover:bg-red-50"
		onclick={onClearPolygons}
	>
		Clear all shapes
	</button>
</div>
