import type { LandcoverGeoJSON } from './types';

type Bounds = { south: number; west: number; north: number; east: number };

type OverpassElement = {
	type: string;
	geometry?: { lat: number; lon: number }[];
};

function wayToRing(geometry: { lat: number; lon: number }[]): [number, number][] {
	if (geometry.length < 3) return [];
	const ring = geometry.map((p) => [p.lon, p.lat] as [number, number]);
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
	return ring;
}

function simplifyRing(ring: [number, number][], step = 3): [number, number][] {
	if (ring.length <= 6) return ring;
	const out: [number, number][] = [];
	for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
	if (out[out.length - 1] !== ring[ring.length - 1]) out.push(ring[ring.length - 1]);
	return out.length >= 4 ? out : ring;
}

/** Fetch forest and river polygons from OSM via Overpass for schematic background */
export async function fetchLandcover(bounds: Bounds): Promise<LandcoverGeoJSON> {
	const { south, west, north, east } = bounds;
	const query = `
[out:json][timeout:20];
(
  way["natural"="wood"](${south},${west},${north},${east});
  way["landuse"="forest"](${south},${west},${north},${east});
  way["natural"="water"](${south},${west},${north},${east});
  way["waterway"="river"](${south},${west},${north},${east});
  way["waterway"="stream"](${south},${west},${north},${east});
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
		const data = (await res.json()) as {
			elements?: (OverpassElement & { tags?: Record<string, string> })[];
		};
		const forests: LandcoverGeoJSON['forests']['features'] = [];
		const rivers: LandcoverGeoJSON['rivers']['features'] = [];

		for (const el of data.elements ?? []) {
			if (el.type !== 'way' || !el.geometry?.length) continue;
			const ring = simplifyRing(wayToRing(el.geometry));
			if (ring.length < 4) continue;

			const feature = {
				type: 'Feature' as const,
				properties: { id: crypto.randomUUID() },
				geometry: { type: 'Polygon' as const, coordinates: [ring] }
			};

			const tags = el.tags ?? {};
			if (tags.waterway || tags.natural === 'water') {
				rivers.push(feature);
			} else {
				forests.push(feature);
			}
		}

		return {
			forests: { type: 'FeatureCollection', features: forests.slice(0, 40) },
			rivers: { type: 'FeatureCollection', features: rivers.slice(0, 40) }
		};
	} catch {
		return {
			forests: { type: 'FeatureCollection', features: [] },
			rivers: { type: 'FeatureCollection', features: [] }
		};
	}
}

export function emptyLandcover(): LandcoverGeoJSON {
	return {
		forests: { type: 'FeatureCollection', features: [] },
		rivers: { type: 'FeatureCollection', features: [] }
	};
}
