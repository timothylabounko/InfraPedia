<script lang="ts">
	type Props = {
		open: boolean;
		x: number;
		y: number;
		onAddPoint: () => void;
		onExtendStart: () => void;
		onExtendEnd: () => void;
		onLineRules: () => void;
		onClose: () => void;
	};

	let { open, x, y, onAddPoint, onExtendStart, onExtendEnd, onLineRules, onClose }: Props = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="segment-popup-backdrop fixed inset-0 z-[1500]" onclick={onClose}></div>
	<div
		class="segment-popup fixed z-[1501] min-w-[168px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
		style="left: {x}px; top: {y}px;"
		role="menu"
	>
		<button
			type="button"
			class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
			onclick={onAddPoint}
		>
			Add point here
		</button>
		<button
			type="button"
			class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
			onclick={onExtendStart}
		>
			Extend from start
		</button>
		<button
			type="button"
			class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
			onclick={onExtendEnd}
		>
			Extend from end
		</button>
		<hr class="my-1 border-slate-100" />
		<button
			type="button"
			class="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
			onclick={onLineRules}
		>
			Line rules…
		</button>
	</div>
{/if}

<style>
	.segment-popup {
		transform: translate(-50%, 8px);
	}
</style>
