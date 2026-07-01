<script lang="ts">
	import { signOut } from '$lib/auth';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import type { User } from '@supabase/supabase-js';
	import type { UserProfile } from '$lib/types/auth';
	import { getAvatarContent } from '$lib/utils/avatar';

	type Props = {
		user: User;
		profile: UserProfile | null;
	};

	let { user, profile }: Props = $props();

	let open = $state(false);

	const avatar = $derived(getAvatarContent(profile, user));
	const displayName = $derived(profile?.username ?? user.email ?? 'Account');

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function handleWindowClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('[data-user-menu]')) {
			close();
		}
	}

	async function handleLogout() {
		close();
		await signOut();
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="relative" data-user-menu>
	<button
		type="button"
		class="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100"
		onclick={toggle}
		aria-expanded={open}
		aria-haspopup="menu"
	>
		<UserAvatar {avatar} size="sm" />
		<span class="hidden text-sm font-medium text-slate-700 sm:inline">{displayName}</span>
	</button>

	{#if open}
		<div
			class="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
			role="menu"
		>
			<a
				href="/creations"
				class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
				role="menuitem"
				onclick={close}
			>
				My creations
			</a>
			<a
				href="/profile"
				class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
				role="menuitem"
				onclick={close}
			>
				Edit profile
			</a>
			<button
				type="button"
				class="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
				role="menuitem"
				onclick={handleLogout}
			>
				Log out
			</button>
		</div>
	{/if}
</div>
