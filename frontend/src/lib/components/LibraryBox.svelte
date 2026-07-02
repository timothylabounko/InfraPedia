<script lang="ts">
	import LibraryImageCarousel from '$lib/components/LibraryImageCarousel.svelte';
	import type { ProjectVisibilityTheme } from '$lib/utils/project-visibility';

	type Props = {
		title: string;
		description?: string;
		subtitle?: string;
		creatorName?: string;
		href?: string;
		comingSoon?: boolean;
		images?: string[];
		openLabel?: string;
		theme?: ProjectVisibilityTheme;
		visibilityLabel?: string;
		selectable?: boolean;
		selected?: boolean;
		onToggleSelect?: () => void;
		canEditCover?: boolean;
		onEditCover?: () => void;
		canDelete?: boolean;
		deleting?: boolean;
		onDelete?: () => void;
	};

	let {
		title,
		description = '',
		subtitle,
		creatorName,
		href,
		comingSoon = true,
		images = [],
		openLabel = 'Open',
		theme = 'light',
		visibilityLabel: visLabel,
		selectable = false,
		selected = false,
		onToggleSelect,
		canEditCover = false,
		onEditCover,
		canDelete = false,
		deleting = false,
		onDelete
	}: Props = $props();

	const shellClass = $derived(
		{
			light: 'border-slate-200 bg-white text-slate-900',
			grey: 'border-slate-300 bg-slate-200 text-slate-900',
			dark: 'border-slate-600 bg-slate-800 text-white'
		}[theme]
	);

	const subtitleClass = $derived(
		{
			light: 'text-slate-500',
			grey: 'text-slate-600',
			dark: 'text-slate-400'
		}[theme]
	);

	const descriptionClass = $derived(
		{
			light: 'text-slate-600',
			grey: 'text-slate-700',
			dark: 'text-slate-300'
		}[theme]
	);

	const placeholderClass = $derived(
		{
			light: 'bg-slate-100',
			grey: 'bg-slate-300/60',
			dark: 'bg-slate-700'
		}[theme]
	);

	const openBtnClass = $derived(
		{
			light: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
			grey: 'border-slate-800 bg-slate-800 text-white hover:bg-slate-700',
			dark: 'border-white bg-white text-slate-900 hover:bg-slate-100'
		}[theme]
	);

	const soonClass = $derived(
		{
			light: 'border-slate-200 bg-slate-50 text-slate-400',
			grey: 'border-slate-300 bg-slate-100 text-slate-500',
			dark: 'border-slate-600 bg-slate-700 text-slate-400'
		}[theme]
	);

	const deleteBtnClass = $derived(
		{
			light: 'border-red-200 text-red-600 hover:bg-red-50',
			grey: 'border-red-300 text-red-700 hover:bg-red-50',
			dark: 'border-red-400/50 text-red-300 hover:bg-red-950/40'
		}[theme]
	);

	const selectRingClass = $derived(
		selected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
	);

	function handleCardClick() {
		if (selectable && onToggleSelect) onToggleSelect();
	}
</script>

<article
	class="library-box relative flex aspect-square w-full shrink-0 flex-col gap-1.5 overflow-hidden rounded-xl border p-3 shadow-sm {shellClass} {selectRingClass} {selectable
		? 'cursor-pointer'
		: ''}"
	role={selectable ? 'checkbox' : undefined}
	aria-checked={selectable ? selected : undefined}
	aria-label={selectable ? `Select ${title}` : undefined}
	tabindex={selectable ? 0 : undefined}
	onclick={selectable ? handleCardClick : undefined}
	onkeydown={selectable
		? (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleCardClick();
				}
			}
		: undefined}
>
	{#if selectable}
		<div class="pointer-events-none absolute right-2 top-2 z-10">
			<span
				class="flex size-5 items-center justify-center rounded border-2 {selected
					? 'border-slate-900 bg-slate-900 text-white'
					: 'border-slate-400 bg-white/90'}"
				aria-hidden="true"
			>
				{#if selected}
					<svg class="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M2 6l3 3 5-5" />
					</svg>
				{/if}
			</span>
		</div>
	{/if}
	<div class="relative flex min-h-0 flex-1 items-center justify-center">
		{#if images.length > 0}
			<LibraryImageCarousel {images} alt={title} square class="h-full max-w-full" />
		{:else}
			<div class="aspect-square h-full max-w-full rounded-lg {placeholderClass}"></div>
		{/if}
		{#if canEditCover && onEditCover && !selectable}
			<button
				type="button"
				class="absolute bottom-1 right-1 z-10 rounded-md border border-white/30 bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/70"
				onclick={(e) => {
					e.stopPropagation();
					onEditCover();
				}}
			>
				Edit cover
			</button>
		{/if}
	</div>

	<div class="shrink-0 space-y-0.5">
		{#if visLabel}
			<p class="text-[10px] font-semibold uppercase tracking-wide {subtitleClass}">{visLabel}</p>
		{:else if subtitle}
			<p class="text-[10px] font-medium uppercase tracking-wide {subtitleClass}">{subtitle}</p>
		{/if}
		<h3 class="line-clamp-1 text-sm font-semibold leading-tight">
			{title}{#if creatorName}<span class="font-normal text-slate-500"> · {creatorName}</span>{/if}
		</h3>
		{#if description}
			<p class="line-clamp-2 text-xs leading-snug {descriptionClass}">{description}</p>
		{/if}
	</div>

	<div class="flex shrink-0 flex-col gap-1.5">
		{#if href}
			<a
				{href}
				class="block w-full rounded-md border px-3 py-2 text-center text-sm font-medium transition {openBtnClass}"
				onclick={(e) => e.stopPropagation()}
			>
				{openLabel}
			</a>
		{:else if comingSoon}
			<span class="block w-full rounded-md border px-3 py-2 text-center text-sm font-medium {soonClass}">
				Coming soon
			</span>
		{/if}
		{#if canDelete && onDelete}
			<button
				type="button"
				class="w-full rounded-md border px-3 py-1.5 text-center text-xs font-medium transition disabled:opacity-50 {deleteBtnClass}"
				disabled={deleting}
				onclick={(e) => {
					e.stopPropagation();
					onDelete();
				}}
			>
				{deleting ? 'Deleting…' : 'Delete'}
			</button>
		{/if}
	</div>
</article>
