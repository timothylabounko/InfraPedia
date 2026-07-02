<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import type { SharingMode } from '$lib/metro/types';

	type Props = {
		projectName: string;
		sharingMode: SharingMode;
		collaboratorEmails: string;
		requireApproval: boolean;
		saveLabel: string;
		isOwner: boolean;
		onProjectNameChange: (v: string) => void;
		onSharingModeChange: (mode: SharingMode) => void;
		onCollaboratorEmailsChange: (v: string) => void;
		onRequireApprovalChange: (v: boolean) => void;
		onSave: () => void;
		tone: 'red' | 'yellow';
	};

	let {
		projectName,
		sharingMode,
		collaboratorEmails,
		requireApproval,
		saveLabel,
		isOwner,
		onProjectNameChange,
		onSharingModeChange,
		onCollaboratorEmailsChange,
		onRequireApprovalChange,
		onSave,
		tone
	}: Props = $props();

	const toneClass = $derived(tone === 'yellow' ? 'bg-yellow-100' : 'bg-red-100');
	const controlClass =
		'h-9 shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm leading-none text-slate-800';
</script>

<div
	class="flex shrink-0 flex-nowrap items-center justify-between gap-3 overflow-x-auto border-b border-black/10 px-3 py-2 {toneClass}"
>
	<div class="flex min-w-0 flex-nowrap items-center gap-2">
		<BackButton href="/" label="Back to library" showArrow={false} />

		<input
			type="text"
			value={projectName}
			oninput={(e) => onProjectNameChange(e.currentTarget.value)}
			class="h-9 min-w-[6rem] max-w-[12rem] shrink border-0 bg-transparent text-sm font-semibold leading-none text-slate-900 focus:ring-0"
			placeholder="Project name"
		/>
	</div>

	<div class="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
		<button
			type="button"
			data-highlight-id="save_project"
			class="{controlClass} font-medium hover:bg-slate-50"
			onclick={onSave}
		>
			{saveLabel}
		</button>

		{#if isOwner}
			<select
				class="{controlClass} min-w-[7rem]"
				value={sharingMode}
				onchange={(e) => onSharingModeChange(e.currentTarget.value as SharingMode)}
				aria-label="Access"
			>
				<option value="private">Private</option>
				<option value="collaborators">Collaborators</option>
				<option value="public">Public</option>
			</select>

			{#if sharingMode === 'collaborators'}
				<input
					type="text"
					class="{controlClass} min-w-[8rem]"
					placeholder="Emails"
					value={collaboratorEmails}
					oninput={(e) => onCollaboratorEmailsChange(e.currentTarget.value)}
					aria-label="Invite emails"
				/>
				<input
					type="checkbox"
					class="size-4 shrink-0 rounded border-slate-300"
					checked={requireApproval}
					onchange={(e) => onRequireApprovalChange(e.currentTarget.checked)}
					title="Require approval"
					aria-label="Require approval"
				/>
			{/if}
		{/if}
	</div>
</div>
