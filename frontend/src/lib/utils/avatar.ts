import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '$lib/types/auth';

const palette = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2'];

export type AvatarContent =
	| { type: 'image'; value: string; color: string }
	| { type: 'icon'; value: string; color: string }
	| { type: 'initials'; value: string; color: string };

export function getAvatarContent(profile: UserProfile | null, user: User | null): AvatarContent {
	const avatarUrl =
		profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;

	if (avatarUrl) {
		return {
			type: 'image',
			value: avatarUrl,
			color: profile?.avatar_color ?? '#2563eb'
		};
	}

	const icon = profile?.display_icon ?? (user?.user_metadata?.display_icon as string | undefined);
	if (icon) {
		return {
			type: 'icon',
			value: icon,
			color: profile?.avatar_color ?? '#2563eb'
		};
	}

	const name = profile?.username ?? user?.email ?? '?';
	const initials = name
		.split(/[\s@._-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');

	const color =
		profile?.avatar_color ??
		(user?.user_metadata?.avatar_color as string | undefined) ??
		palette[(initials.charCodeAt(0) || 0) % palette.length];

	return { type: 'initials', value: initials || '?', color };
}

export const avatarIconOptions = ['🏗️', '🌉', '🗺️', '🚇', '💧', '⚡', '🏙️', '🌿', '📐', '🛤️'];

export const avatarColorOptions = palette;

export const AVATAR_BUCKET = 'avatars';
