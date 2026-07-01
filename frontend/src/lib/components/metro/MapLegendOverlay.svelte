<script lang="ts">
	import type { MapLegendSettings } from '$lib/metro/types';

	type Props = {
		legend: MapLegendSettings;
		zoom: number;
	};

	let { legend, zoom }: Props = $props();

	const positionClass = $derived(
		{
			'bottom-left': 'bottom-4 left-4',
			'bottom-right': 'bottom-4 right-4',
			'top-left': 'top-4 left-4',
			'top-right': 'top-4 right-4'
		}[legend.position]
	);

	/** Rough scale bar width in meters for current zoom at equator */
	const scaleMeters = $derived(Math.round((40075000 / Math.pow(2, zoom + 8)) * 120));
	const scaleLabel = $derived(
		legend.scaleUnit === 'km'
			? scaleMeters >= 1000
				? `${(scaleMeters / 1000).toFixed(1)} km`
				: `${scaleMeters} m`
			: scaleMeters >= 1609
				? `${(scaleMeters / 1609).toFixed(1)} mi`
				: `${Math.round(scaleMeters * 3.281)} ft`
	);
</script>

{#if legend.items.length > 0 || legend.showScaleBar || legend.showNorthArrow}
	<div class="pointer-events-none absolute {positionClass} z-[500] flex flex-col gap-2">
		{#if legend.title || legend.items.length > 0}
			<div class="rounded-md border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
				{#if legend.title}
					<p class="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">{legend.title}</p>
				{/if}
				<ul class="space-y-1">
					{#each legend.items as item (item.id)}
						<li class="flex items-center gap-2 text-xs text-slate-800">
							{#if item.logoUrl}
								<img src={item.logoUrl} alt="" class="h-4 w-4 object-contain" />
							{:else}
								<span class="h-1.5 w-6 rounded-sm" style="background: {item.color}"></span>
							{/if}
							{item.label}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex items-end gap-3">
			{#if legend.showScaleBar}
				<div class="rounded border border-slate-300 bg-white/95 px-2 py-1 shadow-sm">
					<div class="mb-0.5 h-1.5 w-[120px] border-x-2 border-b-2 border-slate-800"></div>
					<span class="text-[10px] font-medium text-slate-700">{scaleLabel}</span>
				</div>
			{/if}
			{#if legend.showNorthArrow}
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-sm font-bold text-slate-800 shadow-sm"
					title="North"
				>
					N
				</div>
			{/if}
		</div>
	</div>
{/if}
