<script lang="ts">
	import {
		CURVATURE_OPTIONS,
		EDGE_TYPE_OPTIONS,
		getLineStyle
	} from '$lib/metro/line-styles';
	import type { LineCurvature, LineEdgeType, LineProperties } from '$lib/metro/types';

	type Props = {
		open: boolean;
		lineId: string | null;
		properties: LineProperties | null;
		onSave: (lineId: string, patch: Partial<LineProperties>) => void;
		onClose: () => void;
	};

	let { open, lineId, properties, onSave, onClose }: Props = $props();

	let name = $state('');
	let curvature = $state<LineCurvature>('straight');
	let edgeType = $state<LineEdgeType>('round');
	let snapToStreets = $state(false);

	$effect(() => {
		if (!properties) return;
		name = properties.name ?? '';
		const preset = getLineStyle(properties.styleId);
		curvature = properties.curvature ?? preset.curvature ?? 'straight';
		edgeType = properties.edgeType ?? preset.edgeType ?? 'round';
		snapToStreets = properties.snapToStreets ?? false;
	});

	function save() {
		if (!lineId) return;
		onSave(lineId, {
			name: name.trim() || undefined,
			curvature,
			edgeType,
			snapToStreets
		});
		onClose();
	}
</script>

{#if open && lineId && properties}
	<div
		class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-4 shadow-xl"
			role="dialog"
			aria-labelledby="line-rules-title"
			tabindex="-1"
		>
			<h2 id="line-rules-title" class="text-base font-semibold text-slate-900">Line rules</h2>
		<p class="mt-1 text-xs text-slate-500">
			Set default corner rounding for all bends on this line. Use per-corner sliders for individual
			control. Sharp = place lines as drawn; rounded applies to every corner.
		</p>

			<div class="mt-4 space-y-3">
				<label class="block text-sm">
					<span class="mb-1 block text-xs font-medium text-slate-600">Line name</span>
					<input
						type="text"
						class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
						placeholder="Optional name"
						bind:value={name}
					/>
				</label>

				<label class="block text-sm">
					<span class="mb-1 block text-xs font-medium text-slate-600">Default corner rounding</span>
					<select
						class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
						bind:value={curvature}
					>
						{#each CURVATURE_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>

				<label class="block text-sm">
					<span class="mb-1 block text-xs font-medium text-slate-600">Corner style</span>
					<select
						class="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
						bind:value={edgeType}
					>
						{#each EDGE_TYPE_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>

				<label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
					<input type="checkbox" class="size-4 rounded" bind:checked={snapToStreets} />
					Snap segments to nearest street
				</label>
			</div>

			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="h-9 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
					onclick={onClose}
				>
					Cancel
				</button>
				<button
					type="button"
					class="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
					onclick={save}
				>
					Apply rules
				</button>
			</div>
		</div>
	</div>
{/if}
