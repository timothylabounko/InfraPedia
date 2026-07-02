import type { LandcoverGeoJSON } from './types';

type Bounds = { south: number; west: number; north: number; east: number };

type OverpassElement = {
	type: string;
	id?: number;
	geometry?: { lat: number; lon: number }[];
	tags?: Record<string, string>;
};

function wayToRing(geometry: { lat: number; lon: number }[]): [number, number][] {
	if (geometry.length < 3) return [];
	const ring = geometry.map((p) => [p.lon, p.lat] as [number, number]);
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
	return ring;
}

/** Schematic-style polygon simplification: fewer vertices, axis-aligned bias */
function schematicSimplifyRing(ring: [number, number][]): [number, number][] {
	if (ring.length <= 5) return ring;

	const step = Math.max(2, Math.floor(ring.length / 12));
	const out: [number, number][] = [];
	for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
	const last = ring[ring.length - 1];
	const tail = out[out.length - 1];
	if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);

	// Snap small edges toward horizontal/vertical for schematic look
	const snapped: [number, number][] = [];
	for (let i = 0; i < out.length; i++) {
		const curr = out[i];
		if (i === 0) {
			snapped.push(curr);
			continue;
		}
		const prev = snapped[snapped.length - 1];
		const dx = Math.abs(curr[0] - prev[0]);
		const dy = Math.abs(curr[1] - prev[1]);
		if (dx > dy * 2) snapped.push([curr[0], prev[1]]);
		else if (dy > dx * 2) snapped.push([prev[0], curr[1]]);
		else snapped.push(curr);
	}

	const f = snapped[0];
	const l = snapped[snapped.length - 1];
	if (f[0] !== l[0] || f[1] !== l[1]) snapped.push([...f]);
	return snapped.length >= 4 ? snapped : ring;
}

function ringArea(ring: [number, number][]) {
	let area = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
	}
	return Math.abs(area / 2);
}

function isWater(tags: Record<string, string>) {
	return (
		tags.natural === 'water' ||
		tags.water != null ||
		tags.landuse === 'reservoir' ||
		tags.landuse === 'basin' ||
		tags.waterway === 'riverbank' ||
		tags.waterway === 'dock'
	);
}

function isForest(tags: Record<string, string>) {
	return (
		tags.natural === 'wood' ||
		tags.landuse === 'forest' ||
		tags.landuse === 'orchard' ||
		tags.natural === 'scrub'
	);
}

/** Fetch forest and water polygons from OSM via Overpass for schematic background */
export async function fetchLandcover(bounds: Bounds): Promise<LandcoverGeoJSON> {
	const { south, west, north, east } = bounds;
	const query = `
[out:json][timeout:25];
(
  way["natural"="wood"](${south},${west},${north},${east});
  way["landuse"="forest"](${south},${west},${north},${east});
  way["natural"="scrub"](${south},${west},${north},${east});
  way["natural"="water"](${south},${west},${north},${east});
  way["water"](${south},${west},${north},${east});
  way["landuse"="reservoir"](${south},${west},${north},${east});
  way["landuse"="basin"](${south},${west},${north},${east});
  relation["natural"="water"](${south},${west},${north},${east});
  relation["water"](${south},${west},${north},${east});
);
out tags geom;
`;

	try {
		const res = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			body: `data=${encodeURIComponent(query)}`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		});
		if (!res.ok) throw new Error('Overpass request failed');
		const data = (await res.json()) as { elements?: OverpassElement[] };
		const forests: LandcoverGeoJSON['forests']['features'] = [];
		const rivers: LandcoverGeoJSON['rivers']['features'] = [];

		for (const el of data.elements ?? []) {
			if (!el.geometry?.length) continue;
			const tags = el.tags ?? {};

			let rings: [number, number][][] = [];
			if (el.type === 'way') {
				const ring = schematicSimplifyRing(wayToRing(el.geometry));
				if (ring.length >= 4) rings = [ring];
			} else if (el.type === 'relation') {
				// Relation geom from Overpass is a flat sequence of member ways
				const ring = schematicSimplifyRing(wayToRing(el.geometry));
				if (ring.length >= 4) rings = [ring];
			}

			for (const ring of rings) {
				if (ringArea(ring) < 1e-8) continue;
				const feature = {
					type: 'Feature' as const,
					properties: { id: crypto.randomUUID() },
					geometry: { type: 'Polygon' as const, coordinates: [ring] }
				};
				if (isWater(tags)) rivers.push(feature);
				else if (isForest(tags)) forests.push(feature);
			}
		}

		// Sort largest first so big water bodies render underneath smaller features
		const byArea = (f: (typeof forests)[0]) => ringArea(f.geometry.coordinates[0]);
		forests.sort((a, b) => byArea(b) - byArea(a));
		rivers.sort((a, b) => byArea(b) - byArea(a));

		return {
			forests: { type: 'FeatureCollection', features: forests.slice(0, 60) },
			rivers: { type: 'FeatureCollection', features: rivers.slice(0, 60) }
		};
	} catch {
		return emptyLandcover();
	}
}

export function emptyLandcover(): LandcoverGeoJSON {
	return {
		forests: { type: 'FeatureCollection', features: [] },
		rivers: { type: 'FeatureCollection', features: [] }
	};
}
