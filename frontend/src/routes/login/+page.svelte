<script lang="ts">
	import { page } from '$app/stores';
	import AuthButton from '$lib/components/AuthButton.svelte';

	const nextPath = $derived($page.url.searchParams.get('next') ?? undefined);
</script>

<main class="flex-1 overflow-y-auto">
	<div class="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-16 text-center">
		<h1 class="text-2xl font-semibold text-slate-900">Sign in to InfraPedia</h1>
		<p class="text-slate-600">Use your Google account to continue.</p>

		<AuthButton mode="sign-in" variant="primary" {nextPath} />

		<aside class="mt-4 w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
			<p class="font-medium">Seeing “provider is not enabled”?</p>
			<p class="mt-2 text-amber-800">
				In Supabase go to <strong>Authentication → Providers → Google</strong>, enable it, and save
				your Google Client ID and Secret.
			</p>
		</aside>
	</div>
</main>
