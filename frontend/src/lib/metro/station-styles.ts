/** Station marker catalog — 50 SVG-based presets */

export type StationIconId = `icon-${string}` | LegacyStationIconId;

type LegacyStationIconId =
	| 'circle'
	| 'square'
	| 'diamond'
	| 'interchange'
	| 'terminal'
	| 'tick'
	| 'cross'
	| 'star'
	| 'hexagon'
	| 'dot';

export const STATION_ICON_SIZE = 16;
export const STATION_ICON_ANCHOR = STATION_ICON_SIZE / 2;

export type StationIconPreset = {
	id: StationIconId;
	name: string;
	svg: string;
	/** @deprecated CSS class fallback for legacy icons */
	markerClass?: string;
};

const STROKE = '#1e293b';
const WHITE = '#ffffff';

function svgWrap(inner: string, size = 16): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">${inner}</svg>`;
}

type ShapeDef = {
	name: string;
	svg: (accent: string, filled: boolean) => string;
};

const SHAPE_DEFS: ShapeDef[] = [
	{
		name: 'Circle',
		svg: (a, f) =>
			svgWrap(
				`<circle cx="8" cy="8" r="5" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2.5"/>`
			)
	},
	{
		name: 'Small dot',
		svg: (a) => svgWrap(`<circle cx="8" cy="8" r="3" fill="${a}"/>`)
	},
	{
		name: 'Tick',
		svg: (a) => svgWrap(`<rect x="7" y="2" width="2" height="12" rx="1" fill="${a}"/>`)
	},
	{
		name: 'Square',
		svg: (a, f) =>
			svgWrap(
				`<rect x="3.5" y="3.5" width="9" height="9" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2.5"/>`
			)
	},
	{
		name: 'Diamond',
		svg: (a, f) =>
			svgWrap(
				`<polygon points="8,2 14,8 8,14 2,8" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2.5"/>`
			)
	},
	{
		name: 'Interchange ring',
		svg: () =>
			svgWrap(
				`<circle cx="8" cy="8" r="5.5" fill="${WHITE}" stroke="${STROKE}" stroke-width="2"/><circle cx="8" cy="8" r="2.5" fill="${WHITE}" stroke="${STROKE}" stroke-width="1.5"/>`
			)
	},
	{
		name: 'Terminal bar',
		svg: (a) =>
			svgWrap(`<rect x="4" y="4" width="8" height="8" rx="1" fill="${a}" stroke="${WHITE}" stroke-width="1.5"/>`)
	},
	{
		name: 'Cross',
		svg: (a) =>
			svgWrap(
				`<rect x="6.5" y="3" width="3" height="10" fill="${a}"/><rect x="3" y="6.5" width="10" height="3" fill="${a}"/>`
			)
	},
	{
		name: 'Star',
		svg: (a) =>
			svgWrap(
				`<polygon points="8,1.5 9.8,6.2 14.8,6.2 10.6,9.3 12.2,14.2 8,11.2 3.8,14.2 5.4,9.3 1.2,6.2 6.2,6.2" fill="${a}"/>`
			)
	},
	{
		name: 'Hexagon',
		svg: (a, f) =>
			svgWrap(
				`<polygon points="8,2 13,5 13,11 8,14 3,11 3,5" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2.5"/>`
			)
	},
	{
		name: 'Triangle',
		svg: (a, f) =>
			svgWrap(
				`<polygon points="8,2 14,13 2,13" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2"/>`
			)
	},
	{
		name: 'Pentagon',
		svg: (a, f) =>
			svgWrap(
				`<polygon points="8,1.5 14,6 12,14 4,14 2,6" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2"/>`
			)
	},
	{
		name: 'Octagon',
		svg: (a, f) =>
			svgWrap(
				`<polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5" fill="${f ? a : WHITE}" stroke="${STROKE}" stroke-width="2"/>`
			)
	},
	{
		name: 'Double circle',
		svg: (a) =>
			svgWrap(
				`<circle cx="8" cy="8" r="6" fill="none" stroke="${STROKE}" stroke-width="1.5"/><circle cx="8" cy="8" r="3.5" fill="${a}"/>`
			)
	},
	{
		name: 'Hollow square',
		svg: () =>
			svgWrap(`<rect x="3" y="3" width="10" height="10" fill="none" stroke="${STROKE}" stroke-width="2.5"/>`)
	},
	{
		name: 'Plus',
		svg: (a) =>
			svgWrap(
				`<rect x="7" y="3" width="2" height="10" fill="${a}"/><rect x="3" y="7" width="10" height="2" fill="${a}"/>`
			)
	},
	{
		name: 'X mark',
		svg: (a) =>
			svgWrap(
				`<line x1="4" y1="4" x2="12" y2="12" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="4" x2="4" y2="12" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/>`
			)
	},
	{
		name: 'Arrow up',
		svg: (a) => svgWrap(`<polygon points="8,2 13,12 3,12" fill="${a}"/>`)
	},
	{
		name: 'Arrow down',
		svg: (a) => svgWrap(`<polygon points="8,14 13,4 3,4" fill="${a}"/>`)
	},
	{
		name: 'Chevron',
		svg: (a) =>
			svgWrap(
				`<polyline points="4,6 8,10 12,6" fill="none" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/>`
			)
	}
];

const VARIANT_SUFFIXES = ['', 'Bold', 'Light', 'Filled', 'Outline'];

const ACCENT_COLORS = [
	'#DA291C',
	'#0039A6',
	'#00843D',
	'#FF8200',
	'#93328E',
	'#E21D38',
	'#0019A8',
	'#F39700',
	'#004C97',
	'#6B4C9A'
];

const LEGACY_IDS: LegacyStationIconId[] = [
	'circle',
	'dot',
	'tick',
	'square',
	'diamond',
	'interchange',
	'terminal',
	'cross',
	'star',
	'hexagon'
];

function buildStationIcons(): StationIconPreset[] {
	const icons: StationIconPreset[] = [];

	for (let i = 0; i < 50; i++) {
		const shape = SHAPE_DEFS[i % SHAPE_DEFS.length];
		const variant = Math.floor(i / SHAPE_DEFS.length);
		const num = String(i + 1).padStart(2, '0');
		const id = `icon-${num}` as StationIconId;
		const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
		const filled = variant % 2 === 1;
		const suffix = VARIANT_SUFFIXES[variant % VARIANT_SUFFIXES.length];
		const name = suffix ? `${shape.name} ${suffix}` : shape.name;

		icons.push({
			id,
			name,
			svg: shape.svg(accent, filled)
		});
	}

	return icons;
}

export const STATION_ICON_PRESETS: StationIconPreset[] = buildStationIcons();

export const STATION_ICON_IDS = STATION_ICON_PRESETS.map((p) => p.id);

const byId = new Map<string, StationIconPreset>();
for (const p of STATION_ICON_PRESETS) {
	byId.set(p.id, p);
}
for (let i = 0; i < LEGACY_IDS.length && i < STATION_ICON_PRESETS.length; i++) {
	byId.set(LEGACY_IDS[i], STATION_ICON_PRESETS[i]);
}

export const DEFAULT_STATION_ICON_ID: StationIconId = 'circle';

export function getStationIcon(id: string): StationIconPreset {
	return byId.get(id) ?? byId.get('circle') ?? STATION_ICON_PRESETS[0];
}

export const LINE_WEIGHT_OPTIONS = [
	{ value: 2, label: 'Thin' },
	{ value: 3, label: 'Light' },
	{ value: 4, label: 'Medium' },
	{ value: 5, label: 'Bold' },
	{ value: 6, label: 'Heavy' },
	{ value: 8, label: 'Extra' }
] as const;
