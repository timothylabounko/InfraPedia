<script lang="ts">
	import type { SharingMode } from '$lib/metro/types';

	type Props = {
		sharingMode: SharingMode;
		collaboratorEmails: string;
		requireApproval: boolean;
		saveStatus: string | null;
		onSharingModeChange: (mode: SharingMode) => void;
		onCollaboratorEmailsChange: (value: string) => void;
		onRequireApprovalChange: (value: boolean) => void;
		onSave: () => void;
	};

	let {
		sharingMode,
		collaboratorEmails,
		requireApproval,
		saveStatus,
		onSharingModeChange,
		onCollaboratorEmailsChange,
		onRequireApprovalChange,
		onSave
	}: Props = $props();
</script>

<div class="flex shrink-0 flex-wrap items-end gap-3 border-b border-black/10 bg-yellow-100 px-4 py-2.5">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-xs font-semibold uppercase tracking-wide text-slate-700">Share &amp; save</span>
		<button
			type="button"
			class="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
			onclick={onSave}
		>
			Save project
		</button>
		{#if saveStatus}
			<span class="text-sm text-green-800">{saveStatus}</span>
		{/if}
	</div>

	<label class="flex flex-col gap-0.5 text-xs text-slate-700">
		<span class="font-medium">Who can access</span>
		<select
			class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
			value={sharingMode}
			onchange={(e) => onSharingModeChange(e.currentTarget.value as SharingMode)}
		>
			<option value="private">Private — only you</option>
			<option value="collaborators">Collaborators — invited users</option>
			<option value="public">Public — anyone can view</option>
		</select>
	</label>

	{#if sharingMode === 'collaborators'}
		<label class="flex min-w-[12rem] flex-1 flex-col gap-0.5 text-xs text-slate-700">
			<span class="font-medium">Invite by email (comma-separated)</span>
			<input
				type="text"
				class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
				placeholder="user@example.com, teammate@org.com"
				value={collaboratorEmails}
				oninput={(e) => onCollaboratorEmailsChange(e.currentTarget.value)}
			/>
		</label>

		<label class="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
			<input
				type="checkbox"
				class="rounded border-slate-300"
				checked={requireApproval}
				onchange={(e) => onRequireApprovalChange(e.currentTarget.checked)}
			/>
			<span>Require my approval before collaborators can edit</span>
		</label>
	{/if}
</div>
