export type StationIconId = import('./station-styles').StationIconId;

export type PolygonShapeType = 'rectangle' | 'ellipse' | 'polygon';

export type LandcoverPolygonFeature = {
	type: 'Feature';
	properties: { id: string };
	geometry: { type: 'Polygon'; coordinates: [number, number][][] };
};

export type LandcoverGeoJSON = {
	forests: { type: 'FeatureCollection'; features: LandcoverPolygonFeature[] };
	rivers: { type: 'FeatureCollection'; features: LandcoverPolygonFeature[] };
};

export type StationProperties = {
	id: string;
	name?: string;
	iconId: StationIconId;
	color?: string;
	attachedLineId?: string;
	linePosition?: number;
};

export type MetroStationFeature = {
	type: 'Feature';
	properties: StationProperties;
	geometry: { type: 'Point'; coordinates: [number, number] };
};

export type MetroStationsGeoJSON = {
	type: 'FeatureCollection';
	features: MetroStationFeature[];
};

export type MapPolygonProperties = {
	id: string;
	fill: string;
	stroke?: string;
	label?: string;
	shapeType: PolygonShapeType;
};

export type MapPolygonFeature = {
	type: 'Feature';
	properties: MapPolygonProperties;
	geometry: { type: 'Polygon'; coordinates: [number, number][][] };
};

export type MapPolygonsGeoJSON = {
	type: 'FeatureCollection';
	features: MapPolygonFeature[];
};

export type LineCurvature = 'straight' | 'gentle' | 'smooth';
export type LineEdgeType = 'square' | 'round' | 'bevel' | 'miter';

export type LineProperties = {
	id: string;
	name?: string;
	color: string;
	styleId: string;
	weight: number;
	dashArray?: string;
	lineCap?: 'round' | 'butt' | 'square';
	lineJoin?: 'round' | 'miter' | 'bevel';
	casingColor?: string;
	casingExtra?: number;
	curvature?: LineCurvature;
	edgeType?: LineEdgeType;
};

export type MetroLineFeature = {
	type: 'Feature';
	properties: LineProperties;
	geometry: { type: 'LineString'; coordinates: [number, number][] };
};

export type MetroGeoJSON = {
	type: 'FeatureCollection';
	features: MetroLineFeature[];
};

export type ViewMode = 'geographic' | 'schematic';
export type MapSource = 'osm' | 'scratch';

export type SharingMode = 'private' | 'public' | 'collaborators';

export type SharingSettings = {
	mode: SharingMode;
	collaboratorEmails: string[];
	requireApproval: boolean;
};

export type EditorBandMode = 'create' | 'collaborate' | 'contribute';

export type AgentActionName =
	| 'enable_draw_mode'
	| 'disable_draw_mode'
	| 'enable_station_mode'
	| 'disable_station_mode'
	| 'draw_line'
	| 'add_station'
	| 'set_draw_style'
	| 'simplify_map'
	| 'set_view_mode'
	| 'set_map_view'
	| 'set_map_source'
	| 'undo'
	| 'clear_lines'
	| 'clear_stations'
	| 'save_project';

export type AgentAction = {
	name: AgentActionName;
	input: Record<string, unknown>;
};

export type LegendItem = {
	id: string;
	color: string;
	label: string;
	logoUrl?: string;
};

export type MapLegendSettings = {
	title: string;
	items: LegendItem[];
	showScaleBar: boolean;
	showNorthArrow: boolean;
	scaleUnit: 'km' | 'mi';
	position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
};

export const DEFAULT_LEGEND: MapLegendSettings = {
	title: 'Metro Map',
	items: [],
	showScaleBar: true,
	showNorthArrow: true,
	scaleUnit: 'km',
	position: 'bottom-right'
};

export type ProjectMapState = {
	viewMode: ViewMode;
	mapSource: MapSource;
	lines: MetroGeoJSON;
	simplifiedLines: MetroGeoJSON | null;
	stations: MetroStationsGeoJSON;
	polygons: MapPolygonsGeoJSON;
	landcover: LandcoverGeoJSON | null;
	legend: MapLegendSettings;
	center: [number, number];
	zoom: number;
};

export type MapBounds = { south: number; west: number; north: number; east: number };

export type MapApi = {
	flyTo: (center: [number, number], zoom: number) => void;
	getBounds: () => MapBounds | null;
	capturePreview: () => Promise<string | null>;
};

export type EditorSnapshot = Pick<
	ProjectMapState,
	| 'viewMode'
	| 'mapSource'
	| 'lines'
	| 'simplifiedLines'
	| 'stations'
	| 'polygons'
	| 'landcover'
	| 'legend'
	| 'center'
	| 'zoom'
>;
