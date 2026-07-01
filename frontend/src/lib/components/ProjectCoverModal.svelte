<script lang="ts">
	import { fileToPreviewDataUrl } from '$lib/metro/map-capture';

	type Props = {
		open: boolean;
		projectId: string;
		projectName: string;
		currentImage: string | null;
		onClose: () => void;
		onSaved: (images: string[]) => void;
	};

	let { open, projectId, projectName, currentImage, onClose, onSaved }: Props = $props();

	let draftImage = $state<string | null>(null);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const preview = $derived(draftImage ?? currentImage);

	$effect(() => {
		if (open) {
			draftImage = null;
			error = null;
		}
	});

	async function onFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		error = null;
		try {
			draftImage = await fileToPreviewDataUrl(file);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load image';
		} finally {
			input.value = '';
		}
	}

	async function saveCover() {
		if (!draftImage) return;
		saving = true;
		error = null;
		try {
			const res = await fetch(`/projects/${projectId}/preview`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: draftImage })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				error = body.error ?? 'Could not save cover';
				return;
			}
			onSaved(body.images ?? [draftImage]);
			onClose();
		} catch {
			error = 'Could not save cover';
		} finally {
			saving = false;
		}
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
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
			class="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Edit project cover"
		>
			<div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
				<h2 class="text-base font-semibold text-slate-900">Edit cover</h2>
				<button
					type="button"
					class="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
					onclick={onClose}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div class="space-y-4 p-4">
				<p class="text-sm text-slate-600">
					Choose a square image for <span class="font-medium text-slate-900">{projectName}</span>.
					Saving a project in the editor also captures your current map view as the cover.
				</p>

				<div class="mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
					{#if preview}
						<img src={preview} alt="Cover preview" class="h-full w-full object-cover" />
					{:else}
						<div class="flex h-full items-center justify-center text-xs text-slate-500">No cover yet</div>
					{/if}
				</div>

				<label class="flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
					Upload image
					<input type="file" accept="image/*" class="sr-only" onchange={onFileSelected} />
				</label>

				{#if error}
					<p class="text-sm text-red-600">{error}</p>
				{/if}

				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50"
						onclick={onClose}
					>
						Cancel
					</button>
					<button
						type="button"
						class="h-9 rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
						disabled={!draftImage || saving}
						onclick={saveCover}
					>
						{saving ? 'Saving…' : 'Save cover'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
