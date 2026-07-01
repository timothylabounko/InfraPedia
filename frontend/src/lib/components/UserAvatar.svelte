<script lang="ts">
	import type { AvatarContent } from '$lib/utils/avatar';

	type Props = {
		avatar: AvatarContent;
		size?: 'sm' | 'md' | 'lg';
	};

	let { avatar, size = 'md' }: Props = $props();

	const sizeClass = {
		sm: 'h-9 w-9 text-sm',
		md: 'h-12 w-12 text-base',
		lg: 'h-16 w-16 text-xl'
	}[size];
</script>

<span
	class="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white {sizeClass}"
	style={avatar.type !== 'image' ? `background-color: ${avatar.color}` : undefined}
>
	{#if avatar.type === 'image'}
		<img src={avatar.value} alt="Profile" class="h-full w-full object-cover" />
	{:else if avatar.type === 'icon'}
		<span class="text-lg">{avatar.value}</span>
	{:else}
		{avatar.value}
	{/if}
</span>
