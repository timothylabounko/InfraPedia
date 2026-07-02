<script lang="ts">
	type Props = {
		open: boolean;
		x: number;
		y: number;
		roundness: number;
		vertexIndex: number;
		onSave: (roundness: number) => void;
		onChange?: (roundness: number) => void;
		onClose: () => void;
	};

	let { open, x, y, roundness, vertexIndex, onSave, onChange, onClose }: Props = $props();

	let value = $state(0);

	$effect(() => {
		value = roundness;
	});

	function clampRoundness(n: number) {
		return Math.max(-100, Math.min(100, Math.round(n)));
	}

	function onSliderInput() {
		value = clampRoundness(value);
		onChange?.(value);
	}

	function onNumberInput() {
		value = clampRoundness(value);
		onChange?.(value);
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="vertex-popup-backdrop fixed inset-0 z-[1500]" onclick={onClose}></div>
	<div
		class="vertex-popup fixed z-[1501] w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
		style="left: {x}px; top: {y}px;"
		role="dialog"
		aria-labelledby="vertex-corner-title"
	>
		<h3 id="vertex-corner-title" class="text-sm font-semibold text-slate-900">Corner #{vertexIndex + 1}</h3>
		<p class="mt-0.5 text-[10px] leading-snug text-slate-500">
			0% = sharp corner. Low values give a tight round; higher values smooth it out. −100% inverts the corner inward.
		</p>

		<div class="mt-3 space-y-2">
			<div class="flex justify-between text-[10px] text-slate-500">
				<span>−100</span>
				<span>0</span>
				<span>+100</span>
			</div>
			<input
				type="range"
				min="-100"
				max="100"
				step="1"
				class="w-full"
				bind:value
				oninput={onSliderInput}
			/>
			<div class="flex items-center gap-2">
				<input
					type="number"
					min="-100"
					max="100"
					class="h-8 w-16 rounded-md border border-slate-200 px-2 text-sm"
					bind:value
					oninput={onNumberInput}
				/>
				<span class="text-sm text-slate-600">%</span>
			</div>
		</div>

		<div class="mt-3 flex justify-end gap-2">
			<button
				type="button"
				class="h-8 rounded-md border border-slate-300 px-2.5 text-xs hover:bg-slate-50"
				onclick={onClose}
			>
				Cancel
			</button>
			<button
				type="button"
				class="h-8 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white"
				onclick={() => onSave(clampRoundness(value))}
			>
				Apply
			</button>
		</div>
	</div>
{/if}

<style>
	.vertex-popup {
		transform: translate(-50%, 8px);
	}
</style>
