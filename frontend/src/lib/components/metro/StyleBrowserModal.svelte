<script lang="ts">
	import {
		LINE_STYLE_PRESETS,
		lineStylePreviewSvg,
		type LineStylePreset
	} from '$lib/metro/line-styles';
	import { STATION_ICON_PRESETS, getStationIcon, type StationIconId } from '$lib/metro/station-styles';

	type Tab = 'lines' | 'stations';

	type Props = {
		open: boolean;
		selectedLineStyleId: string;
		selectedStationIconId: StationIconId;
		onClose: () => void;
		onPickLineStyle: (id: string) => void;
		onPickStationIcon: (id: StationIconId) => void;
	};

	let {
		open,
		selectedLineStyleId,
		selectedStationIconId,
		onClose,
		onPickLineStyle,
		onPickStationIcon
	}: Props = $props();

	let tab = $state<Tab>('lines');

	function pickLine(preset: LineStylePreset) {
		onPickLineStyle(preset.id);
		onPickStationIcon(preset.stationIconId);
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function stationSvg(id: string) {
		return getStationIcon(id).svg;
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={onBackdropClick}
	>
		<div
			class="flex max-h-[min(36rem,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Style browser"
		>
			<div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
				<h2 class="text-base font-semibold text-slate-900">Browse styles</h2>
				<button
					type="button"
					class="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
					onclick={onClose}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div class="flex gap-1 border-b border-slate-100 px-4 pt-2">
				<button
					type="button"
					class="rounded-t-md px-3 py-1.5 text-sm font-medium {tab === 'lines'
						? 'bg-slate-900 text-white'
						: 'text-slate-600 hover:bg-slate-50'}"
					onclick={() => (tab = 'lines')}
				>
					Line styles ({LINE_STYLE_PRESETS.length})
				</button>
				<button
					type="button"
					class="rounded-t-md px-3 py-1.5 text-sm font-medium {tab === 'stations'
						? 'bg-slate-900 text-white'
						: 'text-slate-600 hover:bg-slate-50'}"
					onclick={() => (tab = 'stations')}
				>
					Station icons ({STATION_ICON_PRESETS.length})
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto p-4">
				{#if tab === 'lines'}
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{#each LINE_STYLE_PRESETS as preset (preset.id)}
							<button
								type="button"
								class="flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition hover:border-slate-400 {selectedLineStyleId ===
								preset.id
									? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
									: 'border-slate-200'}"
								onclick={() => pickLine(preset)}
							>
								<div class="flex items-center gap-2">
									{@html lineStylePreviewSvg(preset, 72, 18)}
									<span class="station-icon-inline">{@html stationSvg(preset.stationIconId)}</span>
								</div>
								<span class="text-xs font-medium text-slate-900">{preset.name}</span>
								{#if preset.description}
									<span class="line-clamp-1 text-[10px] text-slate-500">{preset.description}</span>
								{/if}
							</button>
						{/each}
					</div>
				{:else}
					<div class="grid grid-cols-4 gap-2 sm:grid-cols-5">
						{#each STATION_ICON_PRESETS as icon (icon.id)}
							<button
								type="button"
								class="flex flex-col items-center gap-1 rounded-lg border p-2 transition hover:border-slate-400 {selectedStationIconId ===
								icon.id
									? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
									: 'border-slate-200'}"
								onclick={() => onPickStationIcon(icon.id)}
								title={icon.name}
							>
								<span class="station-icon-inline">{@html icon.svg}</span>
								<span class="line-clamp-2 text-center text-[9px] leading-tight text-slate-600"
									>{icon.name}</span
								>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.station-icon-inline svg) {
		display: block;
	}
</style>
