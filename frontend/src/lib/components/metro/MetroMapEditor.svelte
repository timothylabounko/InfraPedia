<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { LatLng, LatLngExpression, LayerGroup, Map, TileLayer } from 'leaflet';
	import { getLineStyle } from '$lib/metro/line-styles';
	import { applyCurvature, snapThresholdForZoom, snapWithAttachment } from '$lib/metro/snap-to-line';
	import { initVertexRoundness } from '$lib/metro/line-curves';
	import { captureMapPreview } from '$lib/metro/map-capture';
	import {
		extendLineEnd,
		findLineFeature,
		insertVertexAt,
		pickSegmentAtPoint,
		projectPointOnSegment,
		vertexRoundnessForIndex
	} from '$lib/metro/line-edit';
	import {
		fetchRoadSegments,
		snapPointToStreets,
		snapSegmentToStreets,
		type RoadSegment
	} from '$lib/metro/street-snap';
	import { getStationIcon, STATION_ICON_ANCHOR, STATION_ICON_SIZE } from '$lib/metro/station-styles';
	import type {
		LandcoverGeoJSON,
		MapApi,
		MapPolygonsGeoJSON,
		MapSource,
		MetroGeoJSON,
		MetroStationsGeoJSON,
		PolygonShapeType,
		ProjectMapState,
		ViewMode
	} from '$lib/metro/types';
	import { newLineId } from '$lib/metro/simplify';

	type Props = {
		mapState: ProjectMapState;
		mapSource: MapSource;
		drawMode: boolean;
		stationMode: boolean;
		viewMode: ViewMode;
		drawColor: string;
		drawStyleId: string;
		drawWeight: number;
		drawCurvature: import('$lib/metro/types').LineCurvature;
		drawEdgeType: import('$lib/metro/types').LineEdgeType;
		drawSnapToStreets: boolean;
		editLineMode: boolean;
		selectedLineId: string | null;
		extendEnd: 'start' | 'end' | null;
		stationIconId: string;
		stationSnapEnabled: boolean;
		defaultStationName: string;
		polygonMode: boolean;
		polygonShape: PolygonShapeType;
		polygonFill: string;
		onLinesChange: (lines: MetroGeoJSON) => void;
		onSimplifiedChange: (lines: MetroGeoJSON) => void;
		onStationsChange: (stations: MetroStationsGeoJSON) => void;
		onPolygonsChange: (polygons: MapPolygonsGeoJSON) => void;
		onMapMove: (center: [number, number], zoom: number) => void;
		onSelectLine: (lineId: string | null) => void;
		onLineGeometryChange: (lineId: string, coordinates: [number, number][]) => void;
		onLineRulesRequest: (lineId: string) => void;
		onRequestExtend: (lineId: string, end: 'start' | 'end') => void;
		onVertexCornerRequest: (payload: {
			lineId: string;
			vertexIndex: number;
			roundness: number;
			x: number;
			y: number;
		}) => void;
		onVertexRoundnessChange: (lineId: string, vertexIndex: number, roundness: number) => void;
		onSegmentMenu: (payload: {
			lineId: string;
			segmentIndex: number;
			point: [number, number];
			x: number;
			y: number;
		}) => void;
		onMapReady?: (api: MapApi) => void;
		getCaptureSurface?: () => HTMLElement | null;
	};

	let {
		mapState,
		mapSource,
		drawMode,
		stationMode,
		viewMode,
		drawColor,
		drawStyleId,
		drawWeight,
		drawCurvature,
		drawEdgeType,
		drawSnapToStreets,
		editLineMode,
		selectedLineId,
		extendEnd,
		stationIconId,
		stationSnapEnabled,
		defaultStationName,
		polygonMode,
		polygonShape,
		polygonFill,
		onLinesChange,
		onSimplifiedChange,
		onStationsChange,
		onPolygonsChange,
		onMapMove,
		onSelectLine,
		onLineGeometryChange,
		onLineRulesRequest,
		onRequestExtend,
		onVertexCornerRequest,
		onVertexRoundnessChange,
		onSegmentMenu,
		onMapReady,
		getCaptureSurface
	}: Props = $props();

	let container: HTMLDivElement;
	let leafletApi: typeof import('leaflet') | null = null;
	let map: Map | null = null;
	let tileLayer: TileLayer | null = null;
	let forestLayer: LayerGroup | null = null;
	let riverLayer: LayerGroup | null = null;
	let geoLayer: LayerGroup | null = null;
	let simplifiedLayer: LayerGroup | null = null;
	let stationLayer: LayerGroup | null = null;
	let polygonLayer: LayerGroup | null = null;
	let draftLayer: LayerGroup | null = null;
	let snapPreviewLayer: LayerGroup | null = null;
	let hitLayer: LayerGroup | null = null;
	let editLayer: LayerGroup | null = null;
	let hitRenderer: import('leaflet').Renderer | null = null;
	let currentLineCoords = $state<[number, number][]>([]);
	let polygonDraft = $state<[number, number][]>([]);
	let mapReady = $state(false);
	let currentZoom = $state(11);
	let roadSegments = $state<RoadSegment[]>([]);
	let roadFetchBoundsKey = $state('');
	let segmentDrag = $state<{
		lineId: string;
		segmentIndex: number;
		startX: number;
		startY: number;
		point: [number, number];
	} | null>(null);
	let segmentDragPreview = $state<[number, number] | null>(null);
	let suppressMapClick = false;

	const isSchematic = $derived(viewMode === 'schematic' || mapSource === 'scratch');
	const lineInteractionEnabled = $derived(!drawMode && !stationMode && !polygonMode);

	/** Tracks line geometry + per-vertex roundness so map layers redraw on slider changes. */
	const linesRenderRevision = $derived.by(() => {
		let key = '';
		for (const f of mapState.lines.features) {
			key += `${f.properties.id}:${f.geometry.coordinates.length}:${JSON.stringify(f.properties.vertexRoundness ?? [])};`;
		}
		for (const f of mapState.simplifiedLines?.features ?? []) {
			key += `s:${f.properties.id}:${f.geometry.coordinates.length}:${JSON.stringify(f.properties.vertexRoundness ?? [])};`;
		}
		return key;
	});

	function lineHitThreshold() {
		return Math.max(30, 2500 / Math.pow(2, currentZoom - 10));
	}

	function lngLatToLeaflet(coord: [number, number]): LatLngExpression {
		return [coord[1], coord[0]];
	}

	function leafletToLngLat(latlng: LatLng): [number, number] {
		return [latlng.lng, latlng.lat];
	}

	function clearLayerGroup(group: LayerGroup | null) {
		group?.clearLayers();
	}

	function edgeToJoin(edge?: string): 'round' | 'miter' | 'bevel' {
		if (edge === 'miter' || edge === 'square') return 'miter';
		if (edge === 'bevel') return 'bevel';
		return 'round';
	}

	function drawLinesOnLayer(group: LayerGroup, geojson: MetroGeoJSON, opacity: number) {
		if (!leafletApi) return;
		const L = leafletApi;

		clearLayerGroup(group);
		for (const feature of geojson.features) {
			const raw = feature.geometry.coordinates as [number, number][];
			const props = feature.properties;
			const preset = getLineStyle(props?.styleId ?? 'boston');
			const curvature = props?.curvature ?? preset.curvature ?? 'straight';
			const coords = applyCurvature(raw, curvature, props?.vertexRoundness).map((c) =>
				lngLatToLeaflet(c)
			);
			if (coords.length < 2) continue;

			const color = props?.color ?? preset.color;
			const weight = props?.weight ?? preset.weight;
			const dashArray = props?.dashArray ?? preset.dashArray;
			const lineCap = props?.lineCap ?? preset.lineCap ?? 'round';
			const lineJoin = props?.lineJoin ?? edgeToJoin(props?.edgeType ?? preset.edgeType);
			const casingColor = props?.casingColor ?? preset.casingColor;
			const casingExtra = props?.casingExtra ?? preset.casingExtra ?? 0;
			const smoothFactor = props?.vertexRoundness?.some((v) => (v ?? 0) !== 0) ? 0 : 0.5;

			if (casingColor && casingExtra > 0) {
				L.polyline(coords, {
					color: casingColor,
					weight: weight + casingExtra,
					opacity,
					lineCap,
					lineJoin,
					smoothFactor
				}).addTo(group);
			}

			L.polyline(coords, {
				color,
				weight,
				opacity,
				lineCap,
				lineJoin,
				smoothFactor,
				...(dashArray ? { dashArray } : {})
			}).addTo(group);
		}
	}

	function drawLandcover(
		layer: LayerGroup | null,
		geojson: LandcoverGeoJSON['forests'],
		fill: string,
		kind: 'forest' | 'water'
	) {
		if (!leafletApi || !layer) return;
		const L = leafletApi;
		clearLayerGroup(layer);

		const fillOpacity = kind === 'forest' ? 0.28 : 0.42;
		const strokeOpacity = kind === 'forest' ? 0.2 : 0.35;

		for (const feature of geojson.features) {
			const rings = feature.geometry.coordinates.map((ring) => ring.map((c) => lngLatToLeaflet(c)));
			L.polygon(rings, {
				color: fill,
				fillColor: fill,
				fillOpacity,
				weight: kind === 'water' ? 1.5 : 0.5,
				opacity: strokeOpacity
			}).addTo(layer);
		}
	}

	function stationHtml(iconId: string, name?: string) {
		const icon = getStationIcon(iconId);
		const label = name ? `<span class="station-label">${name}</span>` : '';
		const body = icon.svg
			? `<span class="station-svg">${icon.svg}</span>`
			: `<span class="metro-station-icon ${icon.markerClass ?? ''}"></span>`;
		return `<div class="metro-station-root">${body}${label}</div>`;
	}

	function stationDivIcon(iconId: string, name?: string) {
		if (!leafletApi) return null;
		const L = leafletApi;
		return L.divIcon({
			className: 'metro-station-wrap',
			html: stationHtml(iconId, name),
			iconSize: [STATION_ICON_SIZE, STATION_ICON_SIZE],
			iconAnchor: [STATION_ICON_ANCHOR, STATION_ICON_ANCHOR]
		});
	}

	function drawStations() {
		if (!leafletApi || !stationLayer) return;
		const L = leafletApi;
		clearLayerGroup(stationLayer);

		for (const feature of mapState.stations.features) {
			const [lng, lat] = feature.geometry.coordinates;
			const props = feature.properties;
			const icon = stationDivIcon(props.iconId, props.name);
			if (!icon) continue;
			L.marker([lat, lng], { icon }).addTo(stationLayer);
		}
	}

	function syncLayers() {
		if (!map || !geoLayer || !simplifiedLayer) return;

		drawLinesOnLayer(geoLayer, mapState.lines, viewMode === 'geographic' ? 0.9 : 0.15);

		const simplified = mapState.simplifiedLines ?? { type: 'FeatureCollection' as const, features: [] };
		drawLinesOnLayer(simplifiedLayer, simplified, isSchematic ? 1 : 0);

		const landcover = mapState.landcover;
		if (isSchematic && landcover) {
			drawLandcover(forestLayer, landcover.forests, '#c8e6c0', 'forest');
			drawLandcover(riverLayer, landcover.rivers, '#9ec9e8', 'water');
		} else {
			clearLayerGroup(forestLayer);
			clearLayerGroup(riverLayer);
		}

		drawStations();
		drawPolygonsOnLayer();

		syncEditUi();

		if (tileLayer) {
			if (isSchematic && mapSource === 'osm') {
				tileLayer.setOpacity(0);
			} else if (mapSource === 'osm') {
				tileLayer.setOpacity(1);
			}
		}

		if (isSchematic && mapSource === 'osm') {
			container.classList.add('schematic-white');
		} else {
			container.classList.remove('schematic-white');
		}
	}

	function applyMapSource(source: MapSource) {
		if (!map || !leafletApi) return;
		const L = leafletApi;

		if (source === 'osm') {
			if (!tileLayer) {
				tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					maxZoom: 19,
					attribution: '© OpenStreetMap contributors',
					crossOrigin: 'anonymous'
				}).addTo(map);
			}
			container.classList.remove('scratch-map');
		} else {
			tileLayer?.remove();
			tileLayer = null;
			container.classList.add('scratch-map');
		}
		syncLayers();
	}

	function lineProps() {
		const style = getLineStyle(drawStyleId);
		const curvature = drawCurvature ?? 'straight';
		return {
			id: newLineId(),
			color: drawColor,
			styleId: drawStyleId,
			weight: drawWeight || style.weight,
			dashArray: style.dashArray,
			lineCap: style.lineCap,
			lineJoin: style.lineJoin,
			casingColor: style.casingColor,
			casingExtra: style.casingExtra,
			curvature,
			edgeType: drawEdgeType ?? style.edgeType,
			snapToStreets: drawSnapToStreets
		};
	}

	function activeLines(): MetroGeoJSON {
		if (isSchematic && mapState.simplifiedLines?.features.length) {
			return mapState.simplifiedLines;
		}
		return mapState.lines;
	}

	function boundsKey() {
		if (!map) return '';
		const b = map.getBounds();
		return `${b.getSouth().toFixed(2)},${b.getWest().toFixed(2)},${b.getNorth().toFixed(2)},${b.getEast().toFixed(2)}`;
	}

	async function ensureRoadSegments() {
		if (!map) return;
		const key = boundsKey();
		if (roadSegments.length > 0 && roadFetchBoundsKey === key) return;
		const b = map.getBounds();
		roadFetchBoundsKey = key;
		roadSegments = await fetchRoadSegments({
			south: b.getSouth(),
			west: b.getWest(),
			north: b.getNorth(),
			east: b.getEast()
		});
	}

	function snapDrawPoint(lng: number, lat: number, useStreets: boolean): [number, number] {
		if (!useStreets || roadSegments.length === 0) return [lng, lat];
		const threshold = snapThresholdForZoom(currentZoom);
		const snapped = snapPointToStreets(lng, lat, roadSegments, threshold);
		return [snapped.lng, snapped.lat];
	}

	function appendDrawPoint(lng: number, lat: number) {
		const useStreets = drawSnapToStreets;
		if (useStreets) void ensureRoadSegments();

		let pt = snapDrawPoint(lng, lat, useStreets && roadSegments.length > 0);
		if (currentLineCoords.length > 0 && useStreets && roadSegments.length > 0) {
			const prev = currentLineCoords[currentLineCoords.length - 1];
			const seg = snapSegmentToStreets(prev, pt, roadSegments, snapThresholdForZoom(currentZoom));
			pt = seg[seg.length - 1];
			if (seg.length > 2) {
				currentLineCoords = [...currentLineCoords, ...seg.slice(1)];
				updateDraftLine();
				return;
			}
		}
		currentLineCoords = [...currentLineCoords, pt];
		updateDraftLine();
	}

	function commitLineGeometry(lineId: string, coordinates: [number, number][]) {
		if (coordinates.length < 2) return;
		clearLayerGroup(draftLayer);
		onLineGeometryChange(lineId, coordinates);
	}

	function drawHitPolylines(collection: MetroGeoJSON) {
		if (!leafletApi || !hitLayer || !map || !hitRenderer) return;
		const L = leafletApi;
		clearLayerGroup(hitLayer);

		if (!lineInteractionEnabled) return;

		for (const feature of collection.features) {
			const raw = feature.geometry.coordinates as [number, number][];
			if (raw.length < 2) continue;
			const lineId = feature.properties.id;
			const isSelected = selectedLineId === lineId;

			for (let i = 0; i < raw.length - 1; i++) {
				const a = raw[i];
				const b = raw[i + 1];
				const coords = [lngLatToLeaflet(a), lngLatToLeaflet(b)];

				const poly = L.polyline(coords, {
					color: isSelected ? '#0284c7' : '#334155',
					weight: isSelected ? 22 : 18,
					opacity: 0.01,
					lineCap: 'round',
					interactive: true,
					renderer: hitRenderer
				}).addTo(hitLayer);

				const segmentIndex = i;

				poly.on('mousedown', (e) => {
					if (!lineInteractionEnabled) return;
					L.DomEvent.stopPropagation(e);
					(e.originalEvent as MouseEvent).preventDefault?.();
					const orig = e.originalEvent as MouseEvent;
					const pt = leafletToLngLat(e.latlng);
					const [px, py] = projectPointOnSegment(pt, a, b);
					segmentDrag = {
						lineId,
						segmentIndex,
						startX: orig.clientX,
						startY: orig.clientY,
						point: [px, py]
					};
					segmentDragPreview = [px, py];
					onSelectLine(lineId);
					map?.dragging.disable();
				});

				poly.on('contextmenu', (e) => {
					L.DomEvent.stopPropagation(e);
					(e.originalEvent as MouseEvent).preventDefault?.();
					const pt = leafletToLngLat(e.latlng);
					const [px, py] = projectPointOnSegment(pt, a, b);
					const me = e.originalEvent as MouseEvent;
					onSelectLine(lineId);
					onSegmentMenu({
						lineId,
						segmentIndex,
						point: [px, py],
						x: me.clientX,
						y: me.clientY
					});
				});

				poly.on('dblclick', (e) => {
					L.DomEvent.stopPropagation(e);
					onSelectLine(lineId);
					onLineRulesRequest(lineId);
				});
			}
		}
	}

	function drawSelectedLineHighlight() {
		if (!leafletApi || !editLayer || !selectedLineId) return;
		const feature = findLineFeature(activeLines(), selectedLineId);
		if (!feature) return;
		const L = leafletApi;
		const raw = feature.geometry.coordinates as [number, number][];
		const props = feature.properties;
		const preset = getLineStyle(props?.styleId ?? 'boston');
		const curvature = props?.curvature ?? preset.curvature ?? 'straight';
		const rendered = applyCurvature(raw, curvature, props?.vertexRoundness).map(lngLatToLeaflet);
		L.polyline(rendered, {
			color: '#0ea5e9',
			weight: (props.weight ?? 4) + 6,
			opacity: 0.25,
			lineCap: 'round',
			interactive: false,
			smoothFactor: props?.vertexRoundness?.some((v) => Math.abs(v ?? 0) >= 0.5) ? 0 : 0.5
		}).addTo(editLayer);
	}

	function previewLineStyle(feature?: { properties: import('$lib/metro/types').LineProperties }) {
		const style = getLineStyle(feature?.properties.styleId ?? drawStyleId);
		return {
			color: feature?.properties.color ?? drawColor ?? style.color,
			weight: feature?.properties.weight ?? drawWeight ?? style.weight,
			curvature: feature?.properties.curvature ?? style.curvature ?? 'straight',
			vertexRoundness: feature?.properties.vertexRoundness
		};
	}

	function drawGeometryPreview(
		coords: [number, number][],
		opts?: {
			color?: string;
			weight?: number;
			curvature?: import('$lib/metro/types').LineCurvature;
			vertexRoundness?: number[];
			dashArray?: string;
		}
	) {
		if (!draftLayer || !leafletApi || coords.length < 2) return;
		const L = leafletApi;
		const curvature = opts?.curvature ?? 'straight';
		const rendered = applyCurvature(coords, curvature, opts?.vertexRoundness).map(lngLatToLeaflet);
		L.polyline(rendered, {
			color: opts?.color ?? '#0ea5e9',
			weight: opts?.weight ?? 4,
			opacity: 0.88,
			lineCap: 'round',
			...(opts?.dashArray ? { dashArray: opts.dashArray } : {})
		}).addTo(draftLayer);
	}

	function updateDrawPreview(latlng: LatLng) {
		if (!draftLayer || !leafletApi || !drawMode) return;
		const L = leafletApi;
		clearLayerGroup(draftLayer);

		const style = getLineStyle(drawStyleId);
		let cursor = leafletToLngLat(latlng);
		if (drawSnapToStreets && roadSegments.length > 0) {
			const snapped = snapPointToStreets(
				cursor[0],
				cursor[1],
				roadSegments,
				snapThresholdForZoom(currentZoom)
			);
			cursor = [snapped.lng, snapped.lat];
		}

		if (currentLineCoords.length >= 1) {
			L.polyline(currentLineCoords.map(lngLatToLeaflet), {
				color: drawColor,
				weight: drawWeight || style.weight,
				opacity: 0.95,
				lineCap: style.lineCap ?? 'round',
				...(style.dashArray ? { dashArray: style.dashArray } : {})
			}).addTo(draftLayer);

			const last = currentLineCoords[currentLineCoords.length - 1];
			L.polyline([lngLatToLeaflet(last), lngLatToLeaflet(cursor)], {
				color: drawColor,
				weight: Math.max(2, (drawWeight || style.weight) - 1),
				opacity: 0.55,
				lineCap: 'round',
				dashArray: '8 6'
			}).addTo(draftLayer);
		}

		L.circleMarker(lngLatToLeaflet(cursor), {
			radius: 8,
			color: drawColor,
			fillColor: '#ffffff',
			fillOpacity: 1,
			weight: 3
		}).addTo(draftLayer);
	}

	function updateVertexDragPreview(lineId: string, vertexIndex: number, lng: number, lat: number) {
		if (!draftLayer || !leafletApi) return;
		const feature = findLineFeature(activeLines(), lineId);
		if (!feature) return;
		clearLayerGroup(draftLayer);
		const coords = [...(feature.geometry.coordinates as [number, number][])];
		coords[vertexIndex] = [lng, lat];
		const ps = previewLineStyle(feature);
		drawGeometryPreview(coords, {
			color: ps.color,
			weight: ps.weight + 1,
			curvature: ps.curvature,
			vertexRoundness: ps.vertexRoundness,
			dashArray: '6 4'
		});
	}
	function updateSegmentDragPreview() {
		if (!draftLayer || !leafletApi || !segmentDrag || !segmentDragPreview) return;
		const feature = findLineFeature(activeLines(), segmentDrag.lineId);
		if (!feature) return;
		clearLayerGroup(draftLayer);
		const coords = feature.geometry.coordinates as [number, number][];
		const next = insertVertexAt(coords, segmentDrag.segmentIndex, segmentDragPreview);
		const ps = previewLineStyle(feature);
		drawGeometryPreview(next, {
			color: ps.color,
			weight: ps.weight + 1,
			curvature: ps.curvature,
			vertexRoundness: ps.vertexRoundness,
			dashArray: '6 4'
		});
		const L = leafletApi;
		L.circleMarker(lngLatToLeaflet(segmentDragPreview), {
			radius: 7,
			color: '#0ea5e9',
			fillColor: '#fff',
			fillOpacity: 1,
			weight: 2
		}).addTo(draftLayer);
	}

	function drawEditHandles() {
		if (!leafletApi || !editLayer) return;
		const L = leafletApi;
		clearLayerGroup(editLayer);

		if (!selectedLineId || !lineInteractionEnabled) return;

		drawSelectedLineHighlight();

		const feature = findLineFeature(activeLines(), selectedLineId);
		if (!feature) return;

		const coords = feature.geometry.coordinates as [number, number][];
		const useStreets = feature.properties.snapToStreets ?? false;
		const lineId = selectedLineId;

		for (let i = 0; i < coords.length; i++) {
			const [lng, lat] = coords[i];
			const isEndpoint = i === 0 || i === coords.length - 1;
			const end = i === 0 ? 'start' : 'end';
			const icon = L.divIcon({
				className: 'line-vertex-handle-wrap',
				html: isEndpoint
					? `<span class="line-vertex-handle line-vertex-end" title="Drag to move or extend">+</span>`
					: `<span class="line-vertex-handle" title="Drag to move, click to round this corner"></span>`,
				iconSize: isEndpoint ? [22, 22] : [16, 16],
				iconAnchor: isEndpoint ? [11, 11] : [8, 8]
			});
			const marker = L.marker([lat, lng], {
				icon,
				draggable: true,
				zIndexOffset: isEndpoint ? 1000 : 500
			}).addTo(editLayer);

			let endpointDragged = false;
			if (isEndpoint) {
				marker.on('dragstart', () => {
					endpointDragged = false;
				});
				marker.on('drag', () => {
					endpointDragged = true;
					const ll = marker.getLatLng();
					updateVertexDragPreview(lineId, i, ll.lng, ll.lat);
				});
				marker.on('click', (e) => {
					if (endpointDragged) {
						endpointDragged = false;
						return;
					}
					L.DomEvent.stopPropagation(e);
					onRequestExtend(lineId, end as 'start' | 'end');
				});
			} else {
				let interiorDragged = false;
				marker.on('dragstart', () => {
					interiorDragged = false;
				});
				marker.on('drag', () => {
					interiorDragged = true;
					const ll = marker.getLatLng();
					updateVertexDragPreview(lineId, i, ll.lng, ll.lat);
				});
				marker.on('click', (e) => {
					if (interiorDragged) {
						interiorDragged = false;
						return;
					}
					L.DomEvent.stopPropagation(e);
					const me = (e.originalEvent as MouseEvent) ?? { clientX: 0, clientY: 0 };
					onVertexCornerRequest({
						lineId,
						vertexIndex: i,
						roundness: vertexRoundnessForIndex(feature.properties, i, coords.length),
						x: me.clientX,
						y: me.clientY
					});
				});
			}

			marker.on('dragend', () => {
				clearLayerGroup(draftLayer);
				const ll = marker.getLatLng();
				let nextLng = ll.lng;
				let nextLat = ll.lat;
				if (useStreets && roadSegments.length > 0) {
					const snapped = snapPointToStreets(nextLng, nextLat, roadSegments, snapThresholdForZoom(currentZoom));
					nextLng = snapped.lng;
					nextLat = snapped.lat;
					marker.setLatLng([nextLat, nextLng]);
				}
				const fresh = findLineFeature(activeLines(), lineId);
				if (!fresh) return;
				const nextCoords = [...(fresh.geometry.coordinates as [number, number][])];
				nextCoords[i] = [nextLng, nextLat];
				commitLineGeometry(lineId, nextCoords);
			});
		}
	}

	function updateExtendPreview(latlng: LatLng) {
		if (!draftLayer || !leafletApi || !extendEnd || !selectedLineId) return;
		const feature = findLineFeature(activeLines(), selectedLineId);
		if (!feature) return;
		const L = leafletApi;
		const coords = feature.geometry.coordinates as [number, number][];
		let pt = leafletToLngLat(latlng);
		if (feature.properties.snapToStreets && roadSegments.length > 0) {
			const snapped = snapPointToStreets(pt[0], pt[1], roadSegments, snapThresholdForZoom(currentZoom));
			pt = [snapped.lng, snapped.lat];
		}
		const anchor = extendEnd === 'start' ? coords[0] : coords[coords.length - 1];
		clearLayerGroup(draftLayer);
		L.polyline([lngLatToLeaflet(anchor), lngLatToLeaflet(pt)], {
			color: '#0ea5e9',
			weight: 3,
			opacity: 0.85,
			dashArray: '6 4'
		}).addTo(draftLayer);
		L.circleMarker(lngLatToLeaflet(pt), {
			radius: 6,
			color: '#0ea5e9',
			fillColor: '#fff',
			fillOpacity: 1,
			weight: 2
		}).addTo(draftLayer);
	}

	function syncEditUi() {
		const collection = activeLines();
		drawHitPolylines(collection);
		drawEditHandles();
	}

	function resolveStationPoint(lng: number, lat: number, shiftKey: boolean) {
		if (!stationSnapEnabled || shiftKey) {
			return { lng, lat, snapped: false as const, attachedLineId: undefined, linePosition: undefined };
		}
		const threshold = snapThresholdForZoom(currentZoom);
		const lines = mapState.lines;
		const simplified = isSchematic ? mapState.simplifiedLines : null;
		const result = snapWithAttachment(lng, lat, lines, simplified, threshold);
		return result;
	}

	function finishLine() {
		if (currentLineCoords.length < 2) {
			currentLineCoords = [];
			clearLayerGroup(draftLayer);
			return;
		}

		const props = lineProps();
		const vertexRoundness =
			props.curvature !== 'straight'
				? initVertexRoundness(currentLineCoords.length, props.curvature)
				: undefined;

		const feature = {
			type: 'Feature' as const,
			properties: { ...props, vertexRoundness },
			geometry: { type: 'LineString' as const, coordinates: [...currentLineCoords] }
		};

		if (isSchematic) {
			const next: MetroGeoJSON = {
				type: 'FeatureCollection',
				features: [...(mapState.simplifiedLines?.features ?? []), feature]
			};
			onSimplifiedChange(next);
		} else {
			const next: MetroGeoJSON = {
				type: 'FeatureCollection',
				features: [...mapState.lines.features, feature]
			};
			onLinesChange(next);
		}

		currentLineCoords = [];
		clearLayerGroup(draftLayer);
		onSelectLine(feature.properties.id);
	}

	function addStationAt(
		lng: number,
		lat: number,
		attachment?: { attachedLineId?: string; linePosition?: number },
		name?: string,
		iconId?: string
	) {
		const feature = {
			type: 'Feature' as const,
			properties: {
				id: newLineId(),
				name: name || defaultStationName || undefined,
				iconId: (iconId ?? stationIconId) as import('$lib/metro/types').StationIconId,
				color: drawColor,
				attachedLineId: attachment?.attachedLineId,
				linePosition: attachment?.linePosition
			},
			geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }
		};
		onStationsChange({
			type: 'FeatureCollection',
			features: [...mapState.stations.features, feature]
		});
	}

	function ringFromCoords(coords: [number, number][]): [number, number][][] {
		if (coords.length < 3) return [];
		const ring = [...coords];
		const f = ring[0];
		const l = ring[ring.length - 1];
		if (f[0] !== l[0] || f[1] !== l[1]) ring.push(f);
		return [ring];
	}

	function bboxRing(a: [number, number], b: [number, number]): [number, number][][] {
		const [lng1, lat1] = a;
		const [lng2, lat2] = b;
		const west = Math.min(lng1, lng2);
		const east = Math.max(lng1, lng2);
		const south = Math.min(lat1, lat2);
		const north = Math.max(lat1, lat2);
		return [[[west, south], [east, south], [east, north], [west, north], [west, south]]];
	}

	function ellipseRing(a: [number, number], b: [number, number], steps = 24): [number, number][][] {
		const [lng1, lat1] = a;
		const [lng2, lat2] = b;
		const cx = (lng1 + lng2) / 2;
		const cy = (lat1 + lat2) / 2;
		const rx = Math.abs(lng2 - lng1) / 2;
		const ry = Math.abs(lat2 - lat1) / 2;
		const ring: [number, number][] = [];
		for (let i = 0; i <= steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			ring.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
		}
		return [ring];
	}

	function finishPolygon() {
		if (!leafletApi) return;
		let rings: [number, number][][] | null = null;
		if (polygonShape === 'rectangle' && polygonDraft.length >= 2) {
			rings = bboxRing(polygonDraft[0], polygonDraft[1]);
		} else if (polygonShape === 'ellipse' && polygonDraft.length >= 2) {
			rings = ellipseRing(polygonDraft[0], polygonDraft[1]);
		} else if (polygonShape === 'polygon' && polygonDraft.length >= 3) {
			rings = ringFromCoords(polygonDraft);
		}
		if (!rings) {
			polygonDraft = [];
			clearLayerGroup(draftLayer);
			return;
		}
		const feature = {
			type: 'Feature' as const,
			properties: {
				id: newLineId(),
				fill: polygonFill,
				shapeType: polygonShape
			},
			geometry: { type: 'Polygon' as const, coordinates: rings }
		};
		onPolygonsChange({
			type: 'FeatureCollection',
			features: [...mapState.polygons.features, feature]
		});
		polygonDraft = [];
		clearLayerGroup(draftLayer);
	}

	function drawPolygonsOnLayer() {
		if (!polygonLayer || !leafletApi) return;
		const L = leafletApi;
		clearLayerGroup(polygonLayer);
		for (const feature of mapState.polygons.features) {
			const rings = feature.geometry.coordinates.map((r) => r.map((c) => lngLatToLeaflet(c)));
			L.polygon(rings, {
				color: feature.properties.stroke ?? feature.properties.fill,
				fillColor: feature.properties.fill,
				fillOpacity: 0.35,
				weight: 2
			}).addTo(polygonLayer);
		}
	}

	function updatePolygonDraft() {
		if (!draftLayer || !leafletApi || !polygonMode) return;
		const L = leafletApi;
		clearLayerGroup(draftLayer);
		if (polygonDraft.length === 0) return;
		if (polygonShape === 'rectangle' && polygonDraft.length >= 1) {
			const rings =
				polygonDraft.length >= 2
					? bboxRing(polygonDraft[0], polygonDraft[1])
					: [[[polygonDraft[0][0], polygonDraft[0][1]]]];
			L.polygon((rings[0] as [number, number][]).map((c) => lngLatToLeaflet(c)), {
				color: polygonFill,
				fillColor: polygonFill,
				fillOpacity: 0.25,
				weight: 2,
				dashArray: '4 4'
			}).addTo(draftLayer);
		} else if (polygonShape === 'ellipse' && polygonDraft.length >= 1) {
			const rings =
				polygonDraft.length >= 2
					? ellipseRing(polygonDraft[0], polygonDraft[1])
					: [[[polygonDraft[0][0], polygonDraft[0][1]]]];
			L.polygon((rings[0] as [number, number][]).map((c) => lngLatToLeaflet(c)), {
				color: polygonFill,
				fillColor: polygonFill,
				fillOpacity: 0.25,
				weight: 2,
				dashArray: '4 4'
			}).addTo(draftLayer);
		} else if (polygonShape === 'polygon') {
			L.polyline(polygonDraft.map(lngLatToLeaflet), {
				color: polygonFill,
				weight: 2,
				dashArray: '4 4'
			}).addTo(draftLayer);
		}
	}

	function updateSnapPreview(latlng: LatLng, shiftKey: boolean) {
		if (!snapPreviewLayer || !leafletApi || !stationMode) return;
		const L = leafletApi;
		clearLayerGroup(snapPreviewLayer);
		const { lng, lat, snapped } = resolveStationPoint(latlng.lng, latlng.lat, shiftKey);
		L.circleMarker([lat, lng], {
			radius: snapped ? 8 : 5,
			color: snapped ? '#0ea5e9' : '#94a3b8',
			fillColor: snapped ? '#38bdf8' : '#cbd5e1',
			fillOpacity: 0.7,
			weight: 2
		}).addTo(snapPreviewLayer);
	}

	function updateDraftLine() {
		if (!draftLayer || !leafletApi) return;
		clearLayerGroup(draftLayer);
		if (currentLineCoords.length < 1) return;
		const style = getLineStyle(drawStyleId);
		const L = leafletApi;
		L.polyline(currentLineCoords.map(lngLatToLeaflet), {
			color: drawColor,
			weight: drawWeight || style.weight,
			opacity: 0.95,
			lineCap: style.lineCap ?? 'round',
			...(style.dashArray ? { dashArray: style.dashArray } : {})
		}).addTo(draftLayer);
	}

	onMount(() => {
		let cancelled = false;
		let onWindowKey: ((e: KeyboardEvent) => void) | null = null;

		void (async () => {
			const [leaflet] = await Promise.all([
				import('leaflet'),
				import('leaflet/dist/leaflet.css')
			]);

			if (cancelled || !container) return;

			leafletApi = leaflet;
			const L = leaflet;

			map = L.map(container, {
				center: lngLatToLeaflet(mapState.center),
				zoom: mapState.zoom,
				zoomControl: false,
				doubleClickZoom: false,
				preferCanvas: true
			});

			L.control.zoom({ position: 'topright' }).addTo(map);

			forestLayer = L.layerGroup().addTo(map);
			riverLayer = L.layerGroup().addTo(map);
			geoLayer = L.layerGroup().addTo(map);
			simplifiedLayer = L.layerGroup().addTo(map);
			stationLayer = L.layerGroup().addTo(map);
			polygonLayer = L.layerGroup().addTo(map);
			draftLayer = L.layerGroup().addTo(map);
			snapPreviewLayer = L.layerGroup().addTo(map);
			hitLayer = L.layerGroup().addTo(map);
			editLayer = L.layerGroup().addTo(map);
			hitRenderer = L.svg({ padding: 0.5 });

			applyMapSource(mapSource);
			syncLayers();
			mapReady = true;

			onMapReady?.({
				flyTo: (center, zoom) => {
					map?.flyTo(lngLatToLeaflet(center), zoom, { duration: 0.8 });
				},
				getBounds: () => {
					if (!map) return null;
					const b = map.getBounds();
					return {
						south: b.getSouth(),
						west: b.getWest(),
						north: b.getNorth(),
						east: b.getEast()
					};
				},
				capturePreview: async () => {
					const surface = getCaptureSurface?.() ?? container;
					if (!surface) return null;
					map?.invalidateSize();
					return captureMapPreview(surface);
				}
			});

			map.on('click', (e) => {
				if (suppressMapClick) {
					suppressMapClick = false;
					return;
				}
				const shift = !!(e.originalEvent as MouseEvent)?.shiftKey;
				const pt = leafletToLngLat(e.latlng);

				if (polygonMode) {
					L.DomEvent.stopPropagation(e);
					if (polygonShape === 'rectangle' || polygonShape === 'ellipse') {
						if (polygonDraft.length === 0) polygonDraft = [pt];
						else {
							polygonDraft = [polygonDraft[0], pt];
							finishPolygon();
						}
					} else {
						polygonDraft = [...polygonDraft, pt];
					}
					updatePolygonDraft();
					return;
				}

				if (stationMode) {
					L.DomEvent.stopPropagation(e);
					const snap = resolveStationPoint(e.latlng.lng, e.latlng.lat, shift);
					addStationAt(snap.lng, snap.lat, {
						attachedLineId: snap.attachedLineId,
						linePosition: snap.linePosition
					});
					clearLayerGroup(snapPreviewLayer);
					return;
				}

				if (selectedLineId && extendEnd) {
					L.DomEvent.stopPropagation(e);
					const feature = findLineFeature(activeLines(), selectedLineId);
					if (!feature) return;
					const useStreets = feature.properties.snapToStreets ?? false;
					if (useStreets) void ensureRoadSegments();
					let point = snapDrawPoint(pt[0], pt[1], useStreets && roadSegments.length > 0);
					const coords = feature.geometry.coordinates as [number, number][];
					const next = extendLineEnd(coords, extendEnd, point);
					commitLineGeometry(selectedLineId, next);
					return;
				}

				if (lineInteractionEnabled) {
					const picked = pickSegmentAtPoint(
						activeLines(),
						pt[0],
						pt[1],
						lineHitThreshold()
					);
					if (picked) {
						L.DomEvent.stopPropagation(e);
						onSelectLine(picked.lineId);
						return;
					}
					if (selectedLineId) {
						onSelectLine(null);
					}
				}

				if (!drawMode) return;
				L.DomEvent.stopPropagation(e);
				if (drawSnapToStreets) void ensureRoadSegments();
				appendDrawPoint(pt[0], pt[1]);
			});

			map.on('mousemove', (e) => {
				if (drawMode) {
					updateDrawPreview(e.latlng);
				}
				if (stationMode) {
					updateSnapPreview(e.latlng, !!(e.originalEvent as MouseEvent)?.shiftKey);
				}
				if (segmentDrag) {
					let pt = leafletToLngLat(e.latlng);
					const feature = findLineFeature(activeLines(), segmentDrag.lineId);
					if (feature?.properties.snapToStreets && roadSegments.length > 0) {
						const snapped = snapPointToStreets(pt[0], pt[1], roadSegments, snapThresholdForZoom(currentZoom));
						pt = [snapped.lng, snapped.lat];
					}
					segmentDragPreview = pt;
					updateSegmentDragPreview();
				} else if (extendEnd && selectedLineId) {
					updateExtendPreview(e.latlng);
				}
			});

			map.on('mouseup', (e) => {
				if (!segmentDrag) return;
				const drag = segmentDrag;
				const me = e.originalEvent as MouseEvent;
				const moved = Math.hypot(me.clientX - drag.startX, me.clientY - drag.startY);
				map?.dragging.enable();
				suppressMapClick = true;

				if (moved > 5 && segmentDragPreview) {
					const feature = findLineFeature(activeLines(), drag.lineId);
					if (feature) {
						const coords = feature.geometry.coordinates as [number, number][];
						const next = insertVertexAt(coords, drag.segmentIndex, segmentDragPreview);
						commitLineGeometry(drag.lineId, next);
					}
				} else {
					const feature = findLineFeature(activeLines(), drag.lineId);
					if (feature) {
						const coords = feature.geometry.coordinates as [number, number][];
						const next = insertVertexAt(coords, drag.segmentIndex, drag.point);
						commitLineGeometry(drag.lineId, next);
					}
				}

				segmentDrag = null;
				segmentDragPreview = null;
				clearLayerGroup(draftLayer);
			});

			map.on('mouseout', () => clearLayerGroup(snapPreviewLayer));

			onWindowKey = (e: KeyboardEvent) => {
				if (e.key === 'Escape' && selectedLineId) {
					onSelectLine(null);
				}
			};
			window.addEventListener('keydown', onWindowKey);

			map.on('dblclick', (e) => {
				if (polygonMode && polygonShape === 'polygon') {
					L.DomEvent.stopPropagation(e);
					finishPolygon();
					return;
				}
				if (!drawMode) return;
				L.DomEvent.stopPropagation(e);
				finishLine();
			});

			map.on('moveend', () => {
				if (!map) return;
				const c = map.getCenter();
				currentZoom = map.getZoom();
				onMapMove([c.lng, c.lat], map.getZoom());
			});

			map.on('zoomend', () => {
				if (map) currentZoom = map.getZoom();
			});
		})();

		return () => {
			cancelled = true;
			if (onWindowKey) window.removeEventListener('keydown', onWindowKey);
			map?.remove();
			map = null;
			tileLayer = null;
			forestLayer = null;
			riverLayer = null;
			geoLayer = null;
			simplifiedLayer = null;
			stationLayer = null;
			polygonLayer = null;
			draftLayer = null;
			snapPreviewLayer = null;
			hitLayer = null;
			editLayer = null;
			leafletApi = null;
			mapReady = false;
		};
	});

	$effect(() => {
		if (mapReady && map) applyMapSource(mapSource);
	});

	$effect(() => {
		void linesRenderRevision;
		if (mapReady && map) syncLayers();
	});

	$effect(() => {
		void linesRenderRevision;
		void selectedLineId;
		if (mapReady && map) {
			syncEditUi();
		}
	});

	$effect(() => {
		if (!drawMode && currentLineCoords.length > 0) {
			finishLine();
		}
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div class="absolute inset-0 h-full w-full" bind:this={container}>
	{#if !mapReady}
		<div class="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
			Loading map…
		</div>
	{/if}
</div>

<style>
	:global(.scratch-map) {
		background-color: #f8fafc;
		background-image:
			linear-gradient(#e2e8f0 1px, transparent 1px),
			linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
		background-size: 40px 40px;
	}

	:global(.scratch-map .leaflet-container),
	:global(.schematic-white .leaflet-container) {
		background: #ffffff;
	}

	:global(.schematic-white) {
		background: #ffffff;
	}

	:global(.metro-station-wrap) {
		background: transparent !important;
		border: none !important;
		overflow: visible !important;
	}

	:global(.metro-station-root) {
		position: relative;
		width: 16px;
		height: 16px;
	}

	:global(.metro-station-icon) {
		display: block;
		width: 16px;
		height: 16px;
	}

	:global(.station-svg) {
		display: block;
		width: 16px;
		height: 16px;
	}

	:global(.station-svg svg) {
		display: block;
		width: 16px;
		height: 16px;
	}

	:global(.station-circle) {
		border-radius: 50%;
		background: #fff;
		border: 3px solid #1e293b;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	:global(.station-square) {
		background: #fff;
		border: 3px solid #1e293b;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	:global(.station-diamond) {
		background: #fff;
		border: 3px solid #1e293b;
		transform: rotate(45deg);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	:global(.station-interchange) {
		border-radius: 50%;
		background: #fff;
		border: 3px solid #1e293b;
		box-shadow: inset 0 0 0 3px #fff, 0 0 0 1px #1e293b;
		width: 16px;
		height: 16px;
	}

	:global(.station-terminal) {
		border-radius: 2px;
		background: #1e293b;
		border: 2px solid #fff;
		box-shadow: 0 0 0 2px #1e293b;
		width: 12px;
		height: 12px;
	}

	:global(.station-dot) {
		border-radius: 50%;
		background: #1e293b;
		width: 8px;
		height: 8px;
		margin: 3px;
	}

	:global(.station-tick) {
		width: 3px;
		height: 14px;
		background: #1e293b;
		margin: 0 5px;
		border-radius: 1px;
	}

	:global(.station-cross)::before,
	:global(.station-cross)::after {
		content: '';
		position: absolute;
		background: #1e293b;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
	}
	:global(.station-cross)::before {
		width: 12px;
		height: 3px;
	}
	:global(.station-cross)::after {
		width: 3px;
		height: 12px;
	}

	:global(.station-star) {
		width: 14px;
		height: 14px;
		background: #1e293b;
		clip-path: polygon(
			50% 0%,
			61% 35%,
			98% 35%,
			68% 57%,
			79% 91%,
			50% 70%,
			21% 91%,
			32% 57%,
			2% 35%,
			39% 35%
		);
	}

	:global(.station-hexagon) {
		width: 14px;
		height: 14px;
		background: #fff;
		border: 3px solid #1e293b;
		clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
	}

	:global(.station-label) {
		position: absolute;
		left: calc(100% + 2px);
		top: 50%;
		transform: translateY(-50%);
		white-space: nowrap;
		font-size: 10px;
		font-weight: 600;
		color: #1e293b;
		text-shadow: 0 0 3px #fff, 0 0 3px #fff;
		pointer-events: none;
	}

	:global(.line-vertex-handle-wrap) {
		background: transparent !important;
		border: none !important;
	}

	:global(.line-vertex-handle) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid #0ea5e9;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		font-size: 14px;
		font-weight: 700;
		line-height: 1;
		color: #0f172a;
	}

	:global(.line-vertex-handle.line-vertex-end) {
		border-color: #0f172a;
		width: 22px;
		height: 22px;
		font-size: 16px;
		background: #f0f9ff;
	}
</style>
