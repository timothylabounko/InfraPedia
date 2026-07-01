<script lang="ts">

	import AgentChat from '$lib/components/metro/AgentChat.svelte';

	import LibraryImageCarousel from '$lib/components/LibraryImageCarousel.svelte';

	import MetroMapEditor from '$lib/components/metro/MetroMapEditor.svelte';

	import ProjectEditorBand from '$lib/components/metro/ProjectEditorBand.svelte';

	import MetroToolsDock from '$lib/components/metro/MetroToolsDock.svelte';

	import FloatingPanel from '$lib/components/metro/FloatingPanel.svelte';

	import CityStylePanel from '$lib/components/metro/panels/CityStylePanel.svelte';

	import DrawToolsPanel from '$lib/components/metro/panels/DrawToolsPanel.svelte';

	import ViewToolsPanel from '$lib/components/metro/panels/ViewToolsPanel.svelte';

	import LegendToolsPanel from '$lib/components/metro/panels/LegendToolsPanel.svelte';

	import MapLegendOverlay from '$lib/components/metro/MapLegendOverlay.svelte';

	import AiActionIndicator from '$lib/components/metro/AiActionIndicator.svelte';

	import StyleBrowserModal from '$lib/components/metro/StyleBrowserModal.svelte';

	import { createEditorHistory, cloneSnapshot } from '$lib/metro/history';

	import { fetchLandcover } from '$lib/metro/landcover';

	import { simplifyMetroMap, emptyStationsGeoJSON, emptyPolygonsGeoJSON, newLineId } from '$lib/metro/simplify';
	import { reprojectAttachedStations } from '$lib/metro/station-attachment';
	import { DEFAULT_LINE_STYLE_ID, applyLineStylePreset, getLineStyle, LINE_COLOR_SWATCHES } from '$lib/metro/line-styles';

	import type {

		AgentAction,

		EditorBandMode,

		EditorSnapshot,

		LineCurvature,

		LineEdgeType,

		LineProperties,

		MapApi,

		MetroGeoJSON,

		MetroStationsGeoJSON,

		PolygonShapeType,

		ProjectMapState,

		SharingMode,

		StationIconId,

		ViewMode

	} from '$lib/metro/types';

	import { onMount } from 'svelte';

	import type { PageData } from './$types';



	let { data }: { data: PageData } = $props();



	const initialState: ProjectMapState = cloneSnapshot({

		...data.mapState,

		mapSource: data.mapState.mapSource ?? 'osm',

		stations: data.mapState.stations ?? emptyStationsGeoJSON(),

		landcover: data.mapState.landcover ?? null,

		polygons: data.mapState.polygons ?? emptyPolygonsGeoJSON(),

		legend: data.mapState.legend ?? {

			title: 'Metro Map',

			items: [],

			showScaleBar: true,

			showNorthArrow: true,

			scaleUnit: 'km',

			position: 'bottom-left'

		}

	});



	let mapState = $state<ProjectMapState>(cloneSnapshot(initialState));

	const history = createEditorHistory(snapshotFrom(initialState));

	let drawMode = $state(false);

	let stationMode = $state(false);

	let viewMode = $state<ViewMode>(initialState.viewMode);

	let mapSource = $state<'osm' | 'scratch'>(initialState.mapSource);

	let sharingMode = $state<SharingMode>(data.sharing.mode);

	let collaboratorEmails = $state(data.sharing.collaboratorEmails.join(', '));

	let requireApproval = $state(data.sharing.requireApproval);

	let drawColor = $state(LINE_COLOR_SWATCHES[0]);

	let drawStyleId = $state(DEFAULT_LINE_STYLE_ID);

	let drawWeight = $state(getLineStyle(DEFAULT_LINE_STYLE_ID).weight);

	let drawCurvature = $state<LineCurvature>(getLineStyle(DEFAULT_LINE_STYLE_ID).curvature ?? 'straight');

	let drawEdgeType = $state<LineEdgeType>(getLineStyle(DEFAULT_LINE_STYLE_ID).edgeType ?? 'round');

	let stationIconId = $state<StationIconId>(getLineStyle(DEFAULT_LINE_STYLE_ID).stationIconId);

	let stationSnapEnabled = $state(true);

	let pendingStationName = $state('');

	let openPanel = $state<'style' | 'draw' | 'view' | 'legend' | null>(null);

	let polygonMode = $state(false);

	let polygonShape = $state<PolygonShapeType>('rectangle');

	let polygonFill = $state('#c4b5fd');

	let aiHighlight = $state<{ id: string; label: string } | null>(null);

	let styleBrowserOpen = $state(false);

	let mapActionBanner = $state<string | null>(null);

	let projectName = $state(data.project.name);


	let saveStatus = $state<string | null>(null);

	const saveLabel = $derived(saveStatus === 'Saved' ? 'Saved' : 'Save project');

	let simplifying = $state(false);

	let showTemplate = $state(

		initialState.lines.features.length === 0 &&

			!initialState.simplifiedLines?.features.length &&

			initialState.stations.features.length === 0

	);

	let mapApi = $state<MapApi | null>(null);

	let captureSurface = $state<HTMLDivElement | undefined>(undefined);

	let canUndo = $state(false);



	const bandMode = $derived<EditorBandMode>(

		!data.project.isOwner

			? 'contribute'

			: data.project.status === 'draft'

				? 'create'

				: sharingMode === 'collaborators'

					? 'collaborate'

					: 'create'

	);



	const bandTone = $derived<'red' | 'yellow'>(bandMode === 'contribute' ? 'yellow' : 'red');



	function snapshotFrom(state: ProjectMapState): EditorSnapshot {

		return cloneSnapshot({

			viewMode: state.viewMode,

			mapSource: state.mapSource,

			lines: state.lines,

			simplifiedLines: state.simplifiedLines,

			stations: state.stations,

			polygons: state.polygons,

			landcover: state.landcover,

			legend: state.legend,

			center: [...state.center] as [number, number],

			zoom: state.zoom

		});

	}



	function recordHistory() {

		history.push(snapshotFrom({ ...mapState, viewMode, mapSource }));

		canUndo = history.canUndo();

	}



	function applySnapshot(snapshot: EditorSnapshot) {

		viewMode = snapshot.viewMode;

		mapSource = snapshot.mapSource;

		mapState = {

			...mapState,

			viewMode: snapshot.viewMode,

			mapSource: snapshot.mapSource,

			lines: snapshot.lines,

			simplifiedLines: snapshot.simplifiedLines,

			stations: snapshot.stations,

			polygons: snapshot.polygons,

			landcover: snapshot.landcover,

			legend: snapshot.legend,

			center: snapshot.center,

			zoom: snapshot.zoom

		};

		mapApi?.flyTo(snapshot.center, snapshot.zoom);

		canUndo = history.canUndo();

	}



	function undo() {

		if (!canUndo) return;

		const prev = history.undo();

		if (prev) applySnapshot(prev);

	}



	const projectContext = $derived(

		`Project: ${projectName}. Status: ${data.project.status}. Band: ${bandMode}. Map: ${mapSource}, view: ${viewMode}. Draw: ${drawColor}, style ${drawStyleId}, weight ${drawWeight}. Lines: ${mapState.lines.features.length}, schematic: ${mapState.simplifiedLines?.features.length ?? 0}, stations: ${mapState.stations.features.length}. Center: [${mapState.center[1].toFixed(4)}, ${mapState.center[0].toFixed(4)}], zoom ${mapState.zoom.toFixed(1)}.`

	);



	function onStyleChange(styleId: string) {

		const applied = applyLineStylePreset(styleId);

		drawStyleId = applied.styleId;

		drawColor = applied.color;

		drawWeight = applied.weight;

		drawCurvature = applied.curvature;

		drawEdgeType = applied.edgeType;

		stationIconId = applied.stationIconId;

	}



	function autoSimplifyFromGeographic(lines = mapState.lines) {

		if (mapSource !== 'osm' || lines.features.length === 0) return null;

		return simplifyMetroMap(lines);

	}



	function onGeographicLinesChange(lines: MetroGeoJSON) {

		recordHistory();

		const simplifiedLines = autoSimplifyFromGeographic(lines);

		let stations = mapState.stations;

		if (simplifiedLines) {

			stations = reprojectAttachedStations(stations, simplifiedLines);

		}

		mapState = { ...mapState, lines, simplifiedLines, stations };

		if (lines.features.length > 0) showTemplate = false;

	}



	function onSimplifiedLinesChange(simplifiedLines: NonNullable<typeof mapState.simplifiedLines>) {

		recordHistory();

		mapState = { ...mapState, simplifiedLines };

		showTemplate = false;

	}



	function onStationsChange(stations: MetroStationsGeoJSON) {

		recordHistory();

		mapState = { ...mapState, stations };

		showTemplate = false;

	}



	async function doSimplify() {

		if (mapState.lines.features.length === 0 && !mapState.simplifiedLines?.features.length) return;

		simplifying = true;

		recordHistory();



		const simplifiedLines =

			mapState.lines.features.length > 0

				? simplifyMetroMap(mapState.lines)

				: mapState.simplifiedLines;



		let landcover = mapState.landcover;

		if (mapSource === 'osm') {

			const bounds = mapApi?.getBounds();

			if (bounds) landcover = await fetchLandcover(bounds);

		}



		viewMode = 'schematic';

		const stations = simplifiedLines

			? reprojectAttachedStations(mapState.stations, simplifiedLines)

			: mapState.stations;

		mapState = { ...mapState, simplifiedLines, landcover, stations, viewMode: 'schematic' };

		showTemplate = false;

		simplifying = false;

	}



	function addLineFromCoords(

		coordinates: [number, number][],

		props?: Partial<LineProperties> & { name?: string }

	) {

		if (coordinates.length < 2) return;

		const style = getLineStyle(props?.styleId ?? drawStyleId);

		const feature = {

			type: 'Feature' as const,

			properties: {

				id: newLineId(),

				color: props?.color ?? drawColor,

				styleId: props?.styleId ?? drawStyleId,

				weight: props?.weight ?? drawWeight ?? style.weight,

				dashArray: props?.dashArray ?? style.dashArray,

				lineCap: props?.lineCap ?? style.lineCap,

				lineJoin: props?.lineJoin ?? style.lineJoin,

				casingColor: props?.casingColor ?? style.casingColor,

				casingExtra: props?.casingExtra ?? style.casingExtra,

				curvature: props?.curvature ?? drawCurvature ?? style.curvature,

				edgeType: props?.edgeType ?? drawEdgeType ?? style.edgeType,

				name: props?.name

			},

			geometry: { type: 'LineString' as const, coordinates }

		};



		recordHistory();

		if (viewMode === 'schematic' || mapSource === 'scratch') {

			const simplifiedLines: MetroGeoJSON = {

				type: 'FeatureCollection',

				features: [...(mapState.simplifiedLines?.features ?? []), feature]

			};

			mapState = { ...mapState, simplifiedLines };

		} else {

			const lines: MetroGeoJSON = {

				type: 'FeatureCollection',

				features: [...mapState.lines.features, feature]

			};

			const simplifiedLines = autoSimplifyFromGeographic(lines);

			mapState = { ...mapState, lines, simplifiedLines };

		}

		showTemplate = false;

	}



	function addStationAt(lat: number, lng: number, name?: string, iconId?: StationIconId) {

		recordHistory();

		const feature = {

			type: 'Feature' as const,

			properties: {

				id: newLineId(),

				name,

				iconId: iconId ?? (stationIconId as StationIconId),

				color: drawColor

			},

			geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }

		};

		mapState = {

			...mapState,

			stations: {

				type: 'FeatureCollection',

				features: [...mapState.stations.features, feature]

			}

		};

		showTemplate = false;

	}



	async function saveProject() {

		const payload = { ...mapState, viewMode, mapSource };

		let previewImage: string | undefined;
		try {
			previewImage = (await mapApi?.capturePreview()) ?? undefined;
		} catch {
			previewImage = undefined;
		}

		const res = await fetch(`/projects/${data.project.id}/save`, {

			method: 'POST',

			headers: { 'Content-Type': 'application/json' },

			body: JSON.stringify({

				mapState: payload,

				name: projectName,

				previewImage,

				sharing: {

					mode: sharingMode,

					collaboratorEmails: collaboratorEmails

						.split(',')

						.map((e: string) => e.trim())

						.filter(Boolean),

					requireApproval

				}

			})

		});

		if (res.ok) {

			saveStatus = 'Saved';

			setTimeout(() => (saveStatus = null), 2000);

		}

	}



	function setViewMode(mode: ViewMode) {

		if (mode === 'geographic' && mapSource === 'scratch') return;

		recordHistory();

		viewMode = mode;

		let stations = mapState.stations;

		if (mode === 'schematic' && mapState.simplifiedLines?.features.length) {

			stations = reprojectAttachedStations(stations, mapState.simplifiedLines);

		} else if (mode === 'geographic' && mapState.lines.features.length) {

			stations = reprojectAttachedStations(stations, mapState.lines);

		}

		mapState = { ...mapState, viewMode: mode, stations };

		if (mode === 'schematic' && mapSource === 'osm' && !mapState.landcover) {

			void fetchLandcoverForView();

		}

	}



	async function fetchLandcoverForView() {

		const bounds = mapApi?.getBounds();

		if (!bounds) return;

		simplifying = true;

		const landcover = await fetchLandcover(bounds);

		mapState = { ...mapState, landcover };

		simplifying = false;

	}



	function setMapSource(source: 'osm' | 'scratch') {

		recordHistory();

		mapSource = source;

		if (source === 'scratch') {

			viewMode = 'schematic';

			mapState = { ...mapState, mapSource: source, viewMode: 'schematic' };

		} else {

			mapState = { ...mapState, mapSource: source };

		}

	}



	function startDraw() {

		drawMode = true;

		stationMode = false;

		polygonMode = false;

		showTemplate = false;

	}



	function startStation() {

		stationMode = true;

		drawMode = false;

		polygonMode = false;

		showTemplate = false;

	}



	function startPolygon(shape: PolygonShapeType) {

		polygonMode = true;

		polygonShape = shape;

		drawMode = false;

		stationMode = false;

		showTemplate = false;

	}



	function onPolygonsChange(polygons: import('$lib/metro/types').MapPolygonsGeoJSON) {

		recordHistory();

		mapState = { ...mapState, polygons };

		showTemplate = false;

	}



	async function handleAgentActions(actions: AgentAction[]) {

		for (const action of actions) {

			switch (action.name) {

				case 'enable_draw_mode':

					startDraw();

					break;

				case 'disable_draw_mode':

					drawMode = false;

					break;

				case 'enable_station_mode':

					startStation();

					break;

				case 'disable_station_mode':

					stationMode = false;

					break;

				case 'draw_line': {

					const raw = action.input.coordinates as unknown;

					if (!Array.isArray(raw) || raw.length < 2) break;

					const coordinates = raw

						.filter((c): c is [number, number] => Array.isArray(c) && c.length >= 2)

						.map((c) => [Number(c[0]), Number(c[1])] as [number, number])

						.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

					addLineFromCoords(coordinates, {

						color: action.input.color as string | undefined,

						styleId: action.input.styleId as string | undefined,

						weight: action.input.weight as number | undefined,

						name: action.input.name as string | undefined

					});

					break;

				}

				case 'add_station': {

					const lat = Number(action.input.lat);

					const lng = Number(action.input.lng);

					if (!Number.isFinite(lat) || !Number.isFinite(lng)) break;

					addStationAt(

						lat,

						lng,

						action.input.name as string | undefined,

						action.input.iconId as StationIconId | undefined

					);

					break;

				}

				case 'set_draw_style':

					if (action.input.styleId) onStyleChange(String(action.input.styleId));

					if (action.input.color) drawColor = String(action.input.color);

					if (action.input.weight) drawWeight = Number(action.input.weight);

					break;

				case 'simplify_map':

					await doSimplify();

					break;

				case 'set_view_mode':

					setViewMode((action.input.mode as ViewMode) ?? 'schematic');

					break;

				case 'set_map_view': {

					const lat = Number(action.input.lat);

					const lng = Number(action.input.lng);

					const zoom = Number(action.input.zoom);

					if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(zoom)) {

						recordHistory();

						const center: [number, number] = [lng, lat];

						mapState = { ...mapState, center, zoom };

						mapApi?.flyTo(center, zoom);

						mapActionBanner = `Moving map to ${lat.toFixed(2)}, ${lng.toFixed(2)}`;

						setTimeout(() => (mapActionBanner = null), 2000);

					}

					break;

				}

				case 'set_map_source':

					setMapSource((action.input.source as 'osm' | 'scratch') ?? 'osm');

					break;

				case 'undo':

					undo();

					break;

				case 'clear_lines':

					recordHistory();

					mapState = {

						...mapState,

						lines: { type: 'FeatureCollection', features: [] },

						simplifiedLines: null,

						landcover: null

					};

					showTemplate = true;

					break;

				case 'clear_stations':

					recordHistory();

					mapState = {

						...mapState,

						stations: emptyStationsGeoJSON()

					};

					break;

				case 'save_project':

					await saveProject();

					break;

			}

		}

	}



	function onKeydown(event: KeyboardEvent) {

		if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {

			event.preventDefault();

			undo();

		}

	}



	onMount(() => {

		window.addEventListener('keydown', onKeydown);

		return () => window.removeEventListener('keydown', onKeydown);

	});

</script>



<div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">

	<ProjectEditorBand
		{projectName}
		{sharingMode}
		{collaboratorEmails}
		{requireApproval}
		{saveLabel}
		isOwner={data.project.isOwner}
		tone={bandTone}
		onProjectNameChange={(v) => (projectName = v)}
		onSharingModeChange={(mode) => (sharingMode = mode)}
		onCollaboratorEmailsChange={(v) => (collaboratorEmails = v)}
		onRequireApprovalChange={(v) => (requireApproval = v)}
		onSave={saveProject}
	/>

	<div class="flex min-h-0 flex-1 overflow-hidden">
		{#if showTemplate}
			<aside
				class="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3 max-md:absolute max-md:z-10 max-md:h-full max-md:shadow-lg"
			>
				<div class="mb-2 flex items-center justify-between">
					<h2 class="text-sm font-semibold text-slate-900">Template example</h2>
					<button
						type="button"
						class="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-white"
						onclick={() => (showTemplate = false)}
					>
						Hide
					</button>
				</div>
				<LibraryImageCarousel images={data.templateImages} alt="Delhi metro map template" />
				<p class="mt-2 text-xs text-slate-600">
					Use the floating tool panels on the map for lines, stations, legend, and view options.
				</p>
			</aside>
		{/if}

		<div class="relative min-h-0 min-w-0 flex-1">
			<div bind:this={captureSurface} class="absolute inset-0 z-0">
				<MetroMapEditor
					{mapState}
					{mapSource}
					{drawMode}
					{stationMode}
					{viewMode}
					{drawColor}
					{drawStyleId}
					{drawWeight}
					{drawCurvature}
					{drawEdgeType}
					{stationIconId}
					stationSnapEnabled={stationSnapEnabled}
					defaultStationName={pendingStationName}
					{polygonMode}
					{polygonShape}
					{polygonFill}
					getCaptureSurface={() => captureSurface ?? null}
					onLinesChange={onGeographicLinesChange}
					onSimplifiedChange={onSimplifiedLinesChange}
					onStationsChange={onStationsChange}
					onPolygonsChange={onPolygonsChange}
					onMapMove={(center, zoom) => {
						mapState = { ...mapState, center, zoom };
					}}
					onMapReady={(api) => {
						mapApi = api;
					}}
				/>

				<MapLegendOverlay legend={mapState.legend} zoom={mapState.zoom} />
			</div>

			<MetroToolsDock
				{openPanel}
				onOpenPanel={(id) => {
					openPanel = id;
				}}
			/>

			<FloatingPanel title="City style" open={openPanel === 'style'} onClose={() => (openPanel = null)}>
				<CityStylePanel
					{drawMode}
					{stationMode}
					{drawColor}
					{drawStyleId}
					{drawWeight}
					{drawCurvature}
					{drawEdgeType}
					{stationIconId}
					stationName={pendingStationName}
					snapEnabled={stationSnapEnabled}
					onDraw={startDraw}
					onStopDraw={() => (drawMode = false)}
					onStation={startStation}
					onStopStation={() => (stationMode = false)}
					onColorChange={(c) => (drawColor = c)}
					onStyleChange={onStyleChange}
					onWeightChange={(w) => (drawWeight = w)}
					onCurvatureChange={(c) => (drawCurvature = c)}
					onEdgeTypeChange={(e) => (drawEdgeType = e)}
					onStationIconChange={(id) => (stationIconId = id)}
					onStationNameChange={(n) => (pendingStationName = n)}
					onSnapToggle={(v) => (stationSnapEnabled = v)}
					onBrowseStyles={() => (styleBrowserOpen = true)}
				/>
			</FloatingPanel>

			<StyleBrowserModal
				open={styleBrowserOpen}
				selectedLineStyleId={drawStyleId}
				selectedStationIconId={stationIconId}
				onClose={() => (styleBrowserOpen = false)}
				onPickLineStyle={(id) => {
					onStyleChange(id);
					styleBrowserOpen = false;
				}}
				onPickStationIcon={(id) => {
					stationIconId = id;
				}}
			/>

			<FloatingPanel title="Shapes" open={openPanel === 'draw'} onClose={() => (openPanel = null)}>
				<DrawToolsPanel
					{polygonMode}
					{polygonShape}
					{polygonFill}
					onStartPolygon={startPolygon}
					onStopPolygon={() => (polygonMode = false)}
					onShapeChange={(s) => (polygonShape = s)}
					onFillChange={(c) => (polygonFill = c)}
					onClearPolygons={() => {
						recordHistory();
						mapState = { ...mapState, polygons: emptyPolygonsGeoJSON() };
					}}
				/>
			</FloatingPanel>

			<FloatingPanel title="View" open={openPanel === 'view'} onClose={() => (openPanel = null)}>
				<ViewToolsPanel
					{viewMode}
					{mapSource}
					{canUndo}
					onGeographic={() => setViewMode('geographic')}
					onSchematic={() => setViewMode('schematic')}
					onOsm={() => setMapSource('osm')}
					onScratch={() => setMapSource('scratch')}
					onSimplify={doSimplify}
					onUndo={undo}
					onClear={() => {
						recordHistory();
						mapState = {
							...mapState,
							lines: { type: 'FeatureCollection', features: [] },
							simplifiedLines: null,
							landcover: null
						};
						showTemplate = true;
					}}
					onClearStations={() => {
						recordHistory();
						mapState = { ...mapState, stations: emptyStationsGeoJSON() };
					}}
				/>
			</FloatingPanel>

			<FloatingPanel title="Legend" open={openPanel === 'legend'} onClose={() => (openPanel = null)} width="20rem">
				<LegendToolsPanel
					legend={mapState.legend}
					lineColors={[
						...mapState.lines.features.map((f) => f.properties.color),
						...(mapState.simplifiedLines?.features.map((f) => f.properties.color) ?? [])
					]}
					onChange={(legend) => {
						recordHistory();
						mapState = { ...mapState, legend };
					}}
				/>
			</FloatingPanel>

			{#if simplifying}
				<div
					class="pointer-events-none absolute bottom-24 right-3 z-[800] rounded-md bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow"
				>
					Fetching landcover…
				</div>
			{/if}

			<AiActionIndicator
				highlightId={aiHighlight?.id ?? null}
				label={aiHighlight?.label ?? null}
				mapBanner={mapActionBanner}
			/>
		</div>

		<AgentChat
			projectId={data.project.id}
			initialMessages={data.chatHistory.map((m) => ({
				id: m.id,
				role: m.role as 'user' | 'assistant',
				content: m.content,
				tool_calls: Array.isArray(m.tool_calls) ? m.tool_calls : []
			}))}
			{projectContext}
			onActions={handleAgentActions}
			onHighlight={(state) => {
				aiHighlight = state;
				if (
					state?.id === 'panel_style' ||
					state?.id === 'panel_lines' ||
					state?.id === 'enable_draw_mode' ||
					state?.id === 'enable_station_mode' ||
					state?.id === 'set_draw_style'
				)
					openPanel = 'style';
				else if (state?.id === 'panel_draw') openPanel = 'draw';
				else if (
					state?.id === 'panel_view' ||
					state?.id === 'simplify_map' ||
					state?.id?.startsWith('set_view_mode') ||
					state?.id?.startsWith('set_map_source')
				)
					openPanel = 'view';
				else if (state?.id === 'set_map_view') openPanel = null;
			}}
		/>
	</div>
</div>

