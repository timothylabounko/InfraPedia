<script lang="ts">
	import AuthButton from '$lib/components/AuthButton.svelte';
	import type { User } from '@supabase/supabase-js';
	import type { UserProfile } from '$lib/types/auth';

	type HeaderData = {
		user: User | null;
		profile: UserProfile | null;
	};

	let { data }: { data: HeaderData } = $props();
</script>

<header class="border-b border-slate-200 bg-white">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="text-xl font-bold tracking-tight text-slate-900">InfraPedia</a>

		{#if data.user}
			<nav class="flex items-center gap-4">
				<span class="hidden text-sm text-slate-500 sm:inline">
					{data.profile?.username ?? data.user.email}
				</span>
				<AuthButton mode="log-out" />
			</nav>
		{/if}
	</div>
</header>
