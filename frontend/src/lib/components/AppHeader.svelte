<script lang="ts">
	import UserMenu from '$lib/components/UserMenu.svelte';
	import type { User } from '@supabase/supabase-js';
	import type { UserProfile } from '$lib/types/auth';

	type HeaderData = {
		user: User | null;
		profile: UserProfile | null;
	};

	let { data }: { data: HeaderData } = $props();
</script>

<header class="shrink-0 border-b border-slate-200 bg-white">
	<div class="flex items-center justify-between px-5 py-4">
		<a href="/" class="text-xl font-semibold tracking-tight text-slate-900">InfraPedia</a>

		{#if data.user}
			<UserMenu user={data.user} profile={data.profile} />
		{/if}
	</div>
</header>
