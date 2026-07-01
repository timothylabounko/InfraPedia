<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import { enhance } from '$app/forms';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { getAvatarContent } from '$lib/utils/avatar';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let username = $state(data.profile.username ?? '');
	let displayIcon = $state(data.profile.display_icon ?? '');
	let avatarColor = $state(data.profile.avatar_color ?? data.colorOptions[0]);
	let removeAvatar = $state(false);
	let avatarPreview = $state<string | null>(null);
	let avatarFileName = $state('');

	const preview = $derived(
		getAvatarContent(
			{
				...data.profile,
				username,
				display_icon: removeAvatar ? null : displayIcon,
				avatar_color: avatarColor,
				avatar_url: removeAvatar ? null : (avatarPreview ?? data.profile.avatar_url ?? null)
			},
			null
		)
	);

	function handleAvatarChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		removeAvatar = false;
		avatarFileName = file.name;
		avatarPreview = URL.createObjectURL(file);
	}
</script>

<main class="flex-1 overflow-y-auto">
	<div class="mx-auto max-w-2xl px-6 py-10">
	<header class="mb-8">
		<BackButton />
		<h1 class="mt-4 text-3xl font-bold text-slate-900">Edit profile</h1>
		<p class="mt-2 text-slate-600">Update your username, icon, or upload a profile photo.</p>
	</header>

	{#if form?.success}
		<p class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
			Profile saved successfully.
		</p>
	{/if}

	{#if form?.error}
		<p class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</p>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="space-y-8 rounded-xl border border-slate-200 bg-white p-6"
	>
		<div class="flex items-center gap-4">
			<UserAvatar avatar={preview} size="lg" />
			<div>
				<p class="font-medium text-slate-900">Profile preview</p>
				<p class="text-sm text-slate-500">{data.profile.email}</p>
			</div>
		</div>

		<div>
			<label class="mb-1 block text-sm font-medium text-slate-700" for="username">Username</label>
			<input
				id="username"
				name="username"
				bind:value={username}
				required
				class="w-full rounded-lg border border-slate-300 px-3 py-2"
				placeholder="Your display name"
			/>
		</div>

		<div>
			<p class="mb-2 text-sm font-medium text-slate-700">Upload profile photo</p>
			<input
				type="file"
				name="avatar"
				accept="image/png,image/jpeg,image/webp,image/gif"
				class="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
				onchange={handleAvatarChange}
			/>
			{#if avatarFileName}
				<p class="mt-2 text-xs text-slate-500">Selected: {avatarFileName}</p>
			{/if}
			{#if data.profile.avatar_url || avatarPreview}
				<label class="mt-3 flex items-center gap-2 text-sm text-slate-600">
					<input type="checkbox" name="remove_avatar" bind:checked={removeAvatar} />
					Remove uploaded photo
				</label>
			{/if}
		</div>

		<div>
			<p class="mb-3 text-sm font-medium text-slate-700">Or choose an emoji icon</p>
			<div class="grid grid-cols-5 gap-2 sm:grid-cols-10">
				{#each data.iconOptions as icon}
					<label class="cursor-pointer">
						<input
							type="radio"
							name="display_icon"
							value={icon}
							bind:group={displayIcon}
							class="peer sr-only"
						/>
						<span
							class="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-xl peer-checked:border-blue-500 peer-checked:bg-blue-50"
						>
							{icon}
						</span>
					</label>
				{/each}
			</div>
			<label class="mt-3 flex items-center gap-2 text-sm text-slate-600">
				<input type="radio" name="display_icon" value="" bind:group={displayIcon} />
				Use initials instead
			</label>
		</div>

		<div>
			<p class="mb-3 text-sm font-medium text-slate-700">Icon background color</p>
			<div class="flex flex-wrap gap-2">
				{#each data.colorOptions as color}
					<label class="cursor-pointer">
						<input
							type="radio"
							name="avatar_color"
							value={color}
							bind:group={avatarColor}
							class="peer sr-only"
						/>
						<span
							class="block h-9 w-9 rounded-full border-2 border-transparent peer-checked:border-slate-900"
							style="background-color: {color}"
						></span>
					</label>
				{/each}
			</div>
		</div>

		<button
			type="submit"
			class="rounded-md border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
		>
			Save profile
		</button>
	</form>
	</div>
</main>
