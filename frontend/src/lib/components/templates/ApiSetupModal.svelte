<script lang="ts">
	import ApiSetupPanel from '$lib/components/templates/ApiSetupPanel.svelte';
	import type { TemplateApiRequirement } from '$lib/data/platform-apis';

	type Props = {
		open: boolean;
		templateSlug: string;
		requiredApiIds: string[];
		config: TemplateApiRequirement[];
		onChange: (config: TemplateApiRequirement[]) => void;
		onClose: () => void;
	};

	let { open, templateSlug, requiredApiIds, config, onChange, onClose }: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div
			class="max-h-[min(90vh,40rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
			role="dialog"
			aria-labelledby="api-setup-title"
			tabindex="-1"
		>
			<div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
				<h2 id="api-setup-title" class="text-base font-semibold text-slate-900">API setup</h2>
				<button
					type="button"
					class="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
					onclick={onClose}
				>
					Close
				</button>
			</div>
			<ApiSetupPanel
				{templateSlug}
				{requiredApiIds}
				{config}
				{onChange}
				variant="modal"
			/>
		</div>
	</div>
{/if}
