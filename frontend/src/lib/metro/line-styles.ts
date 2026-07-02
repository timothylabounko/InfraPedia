import type { LineCurvature, LineEdgeType } from './types';
import { STATION_ICON_PRESETS, type StationIconId } from './station-styles';

export type { LineCurvature, LineEdgeType };

export type LineStylePreset = {
	id: string;
	name: string;
	color: string;
	weight: number;
	casingColor?: string;
	casingExtra?: number;
	dashArray?: string;
	lineCap?: 'round' | 'butt' | 'square';
	lineJoin?: 'round' | 'miter' | 'bevel';
	curvature?: LineCurvature;
	edgeType?: LineEdgeType;
	/** Paired station icon for this metro style */
	stationIconId: StationIconId;
	description?: string;
};

const BASE_PRESETS: Omit<LineStylePreset, 'stationIconId'>[] = [
	{
		id: 'boston',
		name: 'Boston (MBTA)',
		color: '#DA291C',
		weight: 6,
		casingColor: '#ffffff',
		casingExtra: 3,
		lineCap: 'round',
		lineJoin: 'round',
		curvature: 'straight',
		edgeType: 'round',
		description: 'Thick color lines with white halo; 45° schematic angles'
	},
	{
		id: 'nyc',
		name: 'NYC Subway',
		color: '#0039A6',
		weight: 5,
		casingColor: '#000000',
		casingExtra: 4,
		lineCap: 'butt',
		lineJoin: 'miter',
		curvature: 'straight',
		edgeType: 'miter',
		description: 'Color fill with black parallel casing; sharp corners'
	},
	{
		id: 'delhi',
		name: 'Delhi Metro',
		color: '#E21D38',
		weight: 6,
		casingColor: '#ffffff',
		casingExtra: 2,
		lineCap: 'round',
		lineJoin: 'round',
		curvature: 'gentle',
		edgeType: 'round',
		description: 'Bold colored lines, rounded caps, soft bends'
	},
	{
		id: 'london',
		name: 'London Tube',
		color: '#0019A8',
		weight: 5,
		lineCap: 'round',
		lineJoin: 'round',
		curvature: 'straight',
		edgeType: 'round',
		description: 'Solid Pantone route colors, station ticks'
	},
	{
		id: 'paris',
		name: 'Paris Métro',
		color: '#FFBE00',
		weight: 4,
		dashArray: '12 6',
		lineCap: 'butt',
		lineJoin: 'bevel',
		curvature: 'gentle',
		edgeType: 'bevel',
		description: 'Flat caps with station breaks along line'
	},
	{
		id: 'tokyo',
		name: 'Tokyo Metro',
		color: '#F39700',
		weight: 4,
		casingColor: '#333333',
		casingExtra: 2,
		lineCap: 'round',
		lineJoin: 'round',
		curvature: 'smooth',
		edgeType: 'round',
		description: 'Thin casing, smooth curves between nodes'
	},
	{
		id: 'dc',
		name: 'Washington DC',
		color: '#004C97',
		weight: 6,
		lineCap: 'round',
		lineJoin: 'round',
		curvature: 'gentle',
		edgeType: 'round',
		description: 'Heavy rounded lines, wide station dots'
	}
];

const EXTRA_METRO_NAMES = [
	'Chicago L',
	'Berlin U-Bahn',
	'Madrid Metro',
	'Barcelona Metro',
	'Seoul Metro',
	'Hong Kong MTR',
	'Singapore MRT',
	'Sydney Metro',
	'Toronto TTC',
	'Montreal STM',
	'Moscow Metro',
	'St Petersburg',
	'Shanghai Metro',
	'Beijing Subway',
	'Mexico City',
	'São Paulo',
	'Mumbai Metro',
	'Cairo Metro',
	'Athens Metro',
	'Rome Metro',
	'Milan Metro',
	'Amsterdam GVB',
	'Brussels Metro',
	'Vienna U-Bahn',
	'Stockholm Metro',
	'Oslo Metro',
	'Helsinki Metro',
	'Copenhagen Metro',
	'Zurich S-Bahn',
	'Melbourne Metro',
	'Los Angeles',
	'San Francisco',
	'Philadelphia',
	'Atlanta MARTA',
	'Portland MAX',
	'Denver RTD',
	'Houston METRO',
	'Dallas DART',
	'Vancouver SkyTrain',
	'Calgary C-Train',
	'Edinburgh Tram',
	'Manchester Metrolink',
	'Lisbon Metro',
	'Prague Metro',
	'Budapest Metro',
	'Warsaw Metro'
];

const ROUTE_COLORS = [
	'#DA291C',
	'#0039A6',
	'#00843D',
	'#FF8200',
	'#93328E',
	'#E21D38',
	'#0019A8',
	'#F39700',
	'#004C97',
	'#6B4C9A',
	'#00A651',
	'#FFD100',
	'#00B5E2',
	'#A05EB5',
	'#EF3E42',
	'#58595B',
	'#0072CE',
	'#B933AD',
	'#009639',
	'#F58220'
];

const CURVATURE_CYCLE: LineCurvature[] = ['straight', 'gentle', 'smooth'];
const EDGE_CYCLE: LineEdgeType[] = ['round', 'miter', 'bevel', 'square'];
const WEIGHT_CYCLE = [3, 4, 5, 6, 8];

function buildLinePresets(): LineStylePreset[] {
	const presets: LineStylePreset[] = BASE_PRESETS.map((base, i) => ({
		...base,
		stationIconId: STATION_ICON_PRESETS[i % STATION_ICON_PRESETS.length].id
	}));

	let i = 0;
	while (presets.length < 50) {
		const name = EXTRA_METRO_NAMES[i % EXTRA_METRO_NAMES.length];
		const variant = Math.floor(i / EXTRA_METRO_NAMES.length) + 1;
		const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
		const weight = WEIGHT_CYCLE[i % WEIGHT_CYCLE.length];
		const curvature = CURVATURE_CYCLE[i % CURVATURE_CYCLE.length];
		const edgeType = EDGE_CYCLE[i % EDGE_CYCLE.length];
		const hasCasing = i % 3 === 0;
		const hasDash = i % 5 === 2;

		presets.push({
			id: `line-${String(presets.length + 1).padStart(2, '0')}`,
			name: variant > 1 ? `${name} (${variant})` : name,
			color,
			weight,
			casingColor: hasCasing ? (i % 2 ? '#000000' : '#ffffff') : undefined,
			casingExtra: hasCasing ? 2 + (i % 3) : undefined,
			dashArray: hasDash ? `${8 + (i % 4) * 2} ${4 + (i % 3)}` : undefined,
			lineCap: edgeType === 'miter' ? 'butt' : 'round',
			lineJoin: edgeType === 'miter' ? 'miter' : edgeType === 'bevel' ? 'bevel' : 'round',
			curvature,
			edgeType,
			stationIconId: STATION_ICON_PRESETS[presets.length % STATION_ICON_PRESETS.length].id,
			description: `${curvature} lines, ${edgeType} edges`
		});
		i++;
	}

	return presets;
}

export const LINE_STYLE_PRESETS: LineStylePreset[] = buildLinePresets();

export const LINE_COLOR_SWATCHES = [
	'#DA291C',
	'#0039A6',
	'#00843D',
	'#FF8200',
	'#93328E',
	'#E21D38',
	'#0019A8',
	'#F39700',
	'#000000',
	'#ffffff'
];

export const CURVATURE_OPTIONS: { value: LineCurvature; label: string }[] = [
	{ value: 'straight', label: 'Sharp corners (default)' },
	{ value: 'gentle', label: 'Rounded corners' },
	{ value: 'smooth', label: 'Fully rounded corners' }
];

export const EDGE_TYPE_OPTIONS: { value: LineEdgeType; label: string }[] = [
	{ value: 'round', label: 'Round ends' },
	{ value: 'square', label: 'Square ends' },
	{ value: 'bevel', label: 'Bevel (Paris)' },
	{ value: 'miter', label: 'Sharp miter (NYC)' }
];

export function getLineStyle(id: string): LineStylePreset {
	return LINE_STYLE_PRESETS.find((p) => p.id === id) ?? LINE_STYLE_PRESETS[0];
}

export const DEFAULT_LINE_STYLE_ID = 'boston';

export function stationIconForStyle(styleId: string): StationIconId {
	return getLineStyle(styleId).stationIconId;
}

export type AppliedDrawStyle = {
	styleId: string;
	color: string;
	weight: number;
	curvature: LineCurvature;
	edgeType: LineEdgeType;
	stationIconId: StationIconId;
};

export function applyLineStylePreset(styleId: string): AppliedDrawStyle {
	const style = getLineStyle(styleId);
	return {
		styleId: style.id,
		color: style.color,
		weight: style.weight,
		curvature: style.curvature ?? 'straight',
		edgeType: style.edgeType ?? 'round',
		stationIconId: style.stationIconId
	};
}

/** Inline SVG preview of a line style for browser grids */
export function lineStylePreviewSvg(preset: LineStylePreset, width = 80, height = 20): string {
	const casing = preset.casingColor
		? `<line x1="4" y1="${height / 2}" x2="${width - 4}" y2="${height / 2}" stroke="${preset.casingColor}" stroke-width="${preset.weight + (preset.casingExtra ?? 0)}" stroke-linecap="${preset.lineCap ?? 'round'}"/>`
		: '';
	const dash = preset.dashArray ? ` stroke-dasharray="${preset.dashArray}"` : '';
	const main = `<line x1="4" y1="${height / 2}" x2="${width - 4}" y2="${height / 2}" stroke="${preset.color}" stroke-width="${preset.weight}" stroke-linecap="${preset.lineCap ?? 'round'}"${dash}/>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${casing}${main}</svg>`;
}
