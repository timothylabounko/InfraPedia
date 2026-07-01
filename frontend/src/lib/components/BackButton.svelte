<script lang="ts">
	import { goto } from '$app/navigation';

	type Props = {
		href?: string;
		label?: string;
	};

	let { href = '/', label = 'Back to library' }: Props = $props();

	function goBack() {
		goto(href);
	}
</script>

<button
	type="button"
	onclick={goBack}
	class="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium leading-none text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
>
	← {label}
</button>
