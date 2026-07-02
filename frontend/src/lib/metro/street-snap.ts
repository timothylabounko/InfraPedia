type Bounds = { south: number; west: number; north: number; east: number };

export type RoadSegment = {
	a: [number, number];
	b: [number, number];
};

function toRad(d: number) {
	return (d * Math.PI) / 180;
}

function haversineM(a: [number, number], b: [number, number]) {
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const x =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

function nearestOnSegment(
	p: [number, number],
	a: [number, number],
	b: [number, number]
): [number, number, number] {
	const [px, py] = p;
	const [ax, ay] = a;
	const [bx, by] = b;
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return [ax, ay, haversineM(p, a)];
	let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	const proj: [number, number] = [ax + t * dx, ay + t * dy];
	return [proj[0], proj[1], haversineM(p, proj)];
}

/** Fetch drivable/walkable ways from OSM for street snapping */
export async function fetchRoadSegments(bounds: Bounds): Promise<RoadSegment[]> {
	const { south, west, north, east } = bounds;
	const query = `
[out:json][timeout:20];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian)$"](${south},${west},${north},${east});
);
out geom;
`;

	try {
		const res = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			body: `data=${encodeURIComponent(query)}`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		});
		if (!res.ok) return [];
		const data = (await res.json()) as {
			elements?: { type: string; geometry?: { lat: number; lon: number }[] }[];
		};
		const segments: RoadSegment[] = [];
		for (const el of data.elements ?? []) {
			if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
			for (let i = 0; i < el.geometry.length - 1; i++) {
				const a = el.geometry[i];
				const b = el.geometry[i + 1];
				segments.push({
					a: [a.lon, a.lat],
					b: [b.lon, b.lat]
				});
			}
		}
		return segments;
	} catch {
		return [];
	}
}

/** Snap a point to the nearest street centerline within thresholdM */
export function snapPointToStreets(
	lng: number,
	lat: number,
	segments: RoadSegment[],
	thresholdM: number
): { lng: number; lat: number; snapped: boolean } {
	let bestLng = lng;
	let bestLat = lat;
	let bestDist = Infinity;

	for (const seg of segments) {
		const [nx, ny, dist] = nearestOnSegment([lng, lat], seg.a, seg.b);
		if (dist < bestDist) {
			bestDist = dist;
			bestLng = nx;
			bestLat = ny;
		}
	}

	if (bestDist <= thresholdM) {
		return { lng: bestLng, lat: bestLat, snapped: true };
	}
	return { lng, lat, snapped: false };
}

/** Follow street geometry between two nearby snap points on the same way */
export function snapSegmentToStreets(
	from: [number, number],
	to: [number, number],
	segments: RoadSegment[],
	thresholdM: number
): [number, number][] {
	const start = snapPointToStreets(from[0], from[1], segments, thresholdM);
	const end = snapPointToStreets(to[0], to[1], segments, thresholdM);
	if (!start.snapped && !end.snapped) return [from, to];

	const a: [number, number] = start.snapped ? [start.lng, start.lat] : from;
	const b: [number, number] = end.snapped ? [end.lng, end.lat] : to;

	// Find segment that contains both projected points (same OSM way edge chain)
	for (const seg of segments) {
		const [, , d1] = nearestOnSegment(a, seg.a, seg.b);
		const [, , d2] = nearestOnSegment(b, seg.a, seg.b);
		if (d1 <= thresholdM * 2 && d2 <= thresholdM * 2) {
			return [a, b];
		}
	}

	return [a, b];
}
