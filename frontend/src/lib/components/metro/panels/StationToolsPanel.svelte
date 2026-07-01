<script lang="ts">
	import { STATION_ICON_PRESETS } from '$lib/metro/station-styles';
	import type { StationIconId } from '$lib/metro/types';

	type Props = {
		stationMode: boolean;
		stationIconId: StationIconId;
		stationName: string;
		snapEnabled: boolean;
		onStation: () => void;
		onStopStation: () => void;
		onStationIconChange: (id: StationIconId) => void;
		onStationNameChange: (name: string) => void;
		onSnapToggle: (enabled: boolean) => void;
	};

	let {
		stationMode,
		stationIconId,
		stationName,
		snapEnabled,
		onStation,
		onStopStation,
		onStationIconChange,
		onStationNameChange,
		onSnapToggle
	}: Props = $props();
</script>

<div class="space-y-3 text-sm">
	{#if stationMode}
		<button
			type="button"
			data-highlight-id="disable_station_mode"
			class="h-9 w-full rounded-md border border-slate-300 bg-slate-100"
			onclick={onStopStation}
		>
			Stop adding stations
		</button>
	{:else}
		<button
			type="button"
			data-highlight-id="enable_station_mode"
			class="h-9 w-full rounded-md border border-slate-900 bg-slate-900 font-medium text-white"
			onclick={onStation}
		>
			Add station
		</button>
	{/if}

	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">Station icon</span>
		<select
			class="h-9 w-full rounded-md border border-slate-200 px-2"
			value={stationIconId}
			onchange={(e) => onStationIconChange(e.currentTarget.value as StationIconId)}
		>
			{#each STATION_ICON_PRESETS as icon}
				<option value={icon.id}>{icon.name}</option>
			{/each}
		</select>
	</label>

	<label class="block">
		<span class="mb-1 block text-xs font-medium text-slate-600">Default station name</span>
		<input
			type="text"
			class="h-9 w-full rounded-md border border-slate-200 px-2"
			placeholder="Optional — click map to place"
			value={stationName}
			oninput={(e) => onStationNameChange(e.currentTarget.value)}
		/>
	</label>

	<label class="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
		<input
			type="checkbox"
			class="size-4 rounded"
			checked={snapEnabled}
			onchange={(e) => onSnapToggle(e.currentTarget.checked)}
		/>
		Snap to metro lines (hold Shift to place freely)
	</label>
</div>
