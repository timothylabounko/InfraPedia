<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { LatLng, LatLngExpression, LayerGroup, Map, TileLayer } from 'leaflet';
	import { getLineStyle } from '$lib/metro/line-styles';
	import { applyCurvature, snapThresholdForZoom, snapWithAttachment } from '$lib/metro/snap-to-line';
	import { captureMapPreview } from '$lib/metro/map-capture';
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
	let currentLineCoords = $state<[number, number][]>([]);
	let polygonDraft = $state<[number, number][]>([]);
	let mapReady = $state(false);
	let currentZoom = $state(11);

	const isSchematic = $derived(viewMode === 'schematic' || mapSource === 'scratch');

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
			const coords = applyCurvature(raw, curvature).map((c) => lngLatToLeaflet(c));
			if (coords.length < 2) continue;

			const color = props?.color ?? preset.color;
			const weight = props?.weight ?? preset.weight;
			const dashArray = props?.dashArray ?? preset.dashArray;
			const lineCap = props?.lineCap ?? preset.lineCap ?? 'round';
			const lineJoin = props?.lineJoin ?? edgeToJoin(props?.edgeType ?? preset.edgeType);
			const casingColor = props?.casingColor ?? preset.casingColor;
			const casingExtra = props?.casingExtra ?? preset.casingExtra ?? 0;

			if (casingColor && casingExtra > 0) {
				L.polyline(coords, {
					color: casingColor,
					weight: weight + casingExtra,
					opacity,
					lineCap,
					lineJoin,
					smoothFactor: curvature === 'smooth' ? 2 : 0.5
				}).addTo(group);
			}

			L.polyline(coords, {
				color,
				weight,
				opacity,
				lineCap,
				lineJoin,
				smoothFactor: curvature === 'smooth' ? 2 : 0.5,
				...(dashArray ? { dashArray } : {})
			}).addTo(group);
		}
	}

	function drawLandcover(layer: LayerGroup | null, geojson: LandcoverGeoJSON['forests'], fill: string) {
		if (!leafletApi || !layer) return;
		const L = leafletApi;
		clearLayerGroup(layer);

		for (const feature of geojson.features) {
			const rings = feature.geometry.coordinates.map((ring) => ring.map((c) => lngLatToLeaflet(c)));
			L.polygon(rings, {
				color: fill,
				fillColor: fill,
				fillOpacity: 0.45,
				weight: 1,
				opacity: 0.6
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
			drawLandcover(forestLayer, landcover.forests, '#b8e0b0');
			drawLandcover(riverLayer, landcover.rivers, '#a8d4f0');
		} else {
			clearLayerGroup(forestLayer);
			clearLayerGroup(riverLayer);
		}

		drawStations();
		drawPolygonsOnLayer();

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
			curvature: drawCurvature ?? style.curvature,
			edgeType: drawEdgeType ?? style.edgeType
		};
	}

	function activeLines(): MetroGeoJSON {
		if (isSchematic && mapState.simplifiedLines?.features.length) {
			return mapState.simplifiedLines;
		}
		return mapState.lines;
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

		const feature = {
			type: 'Feature' as const,
			properties: lineProps(),
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
		const L = leafletApi;

		clearLayerGroup(draftLayer);
		if (currentLineCoords.length < 1) return;

		const style = getLineStyle(drawStyleId);
		L.polyline(currentLineCoords.map(lngLatToLeaflet), {
			color: drawColor,
			weight: drawWeight || style.weight,
			opacity: 0.9,
			lineCap: style.lineCap ?? 'round',
			dashArray: style.dashArray ?? '6 4'
		}).addTo(draftLayer);
	}

	onMount(() => {
		let cancelled = false;

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
				if (!drawMode) return;
				L.DomEvent.stopPropagation(e);
				currentLineCoords = [...currentLineCoords, pt];
				updateDraftLine();
			});

			map.on('mousemove', (e) => {
				if (stationMode) {
					updateSnapPreview(e.latlng, !!(e.originalEvent as MouseEvent)?.shiftKey);
				}
			});

			map.on('mouseout', () => clearLayerGroup(snapPreviewLayer));

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
			leafletApi = null;
			mapReady = false;
		};
	});

	$effect(() => {
		if (mapReady && map) applyMapSource(mapSource);
	});

	$effect(() => {
		if (mapReady && map) syncLayers();
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
</style>
