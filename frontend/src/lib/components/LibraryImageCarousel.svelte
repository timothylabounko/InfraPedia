<script lang="ts">
	type Props = {
		images: string[];
		alt: string;
		square?: boolean;
		class?: string;
	};

	let { images, alt, square = false, class: className = '' }: Props = $props();

	const slides = $derived([...new Set(images.filter(Boolean))]);
	let index = $state(0);

	const current = $derived(slides[index] ?? slides[0]);
	const hasMultiple = $derived(slides.length > 1);

	function prev(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		index = (index - 1 + slides.length) % slides.length;
	}

	function next(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		index = (index + 1) % slides.length;
	}
</script>

<div
	class="relative overflow-hidden rounded-lg bg-slate-100 {square
		? `aspect-square ${className}`
		: `aspect-[4/3] w-full ${className}`}"
>
	{#if current}
		<img src={current} {alt} class="h-full w-full object-cover object-center" />
	{/if}

	{#if hasMultiple}
		<button
			type="button"
			class="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
			aria-label="Previous image"
			onclick={prev}
		>
			‹
		</button>
		<button
			type="button"
			class="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
			aria-label="Next image"
			onclick={next}
		>
			›
		</button>
		<div class="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
			{#each slides as _, i}
				<span class="h-1.5 w-1.5 rounded-full {i === index ? 'bg-white' : 'bg-white/50'}"></span>
			{/each}
		</div>
	{/if}
</div>
