<script lang="ts">
	import { signInWithGoogle, signOut } from '$lib/auth';

	type Props = {
		mode: 'sign-in' | 'log-out';
		variant?: 'primary' | 'outline';
		nextPath?: string;
	};

	let { mode, variant = 'outline', nextPath }: Props = $props();

	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	const buttonClass = $derived(
		variant === 'primary'
			? 'rounded-md border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60'
			: 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'
	);

	async function handleClick() {
		loading = true;
		errorMessage = null;

		try {
			if (mode === 'sign-in') {
				await signInWithGoogle(nextPath);
			} else {
				await signOut();
			}
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Something went wrong. Please try again.';
			loading = false;
		}
	}
</script>

<div class="flex flex-col items-center gap-2 {variant === 'outline' ? 'items-end' : ''}">
	{#if errorMessage}
		<p class="max-w-sm text-center text-sm text-red-600 {variant === 'outline' ? 'text-right text-xs' : ''}">
			{errorMessage}
		</p>
	{/if}
	<button type="button" class={buttonClass} disabled={loading} onclick={handleClick}>
		{#if mode === 'sign-in'}
			{loading ? 'Redirecting…' : 'Sign in with Google'}
		{:else}
			{loading ? 'Signing out…' : 'Log out'}
		{/if}
	</button>
</div>
