import type { MetroGeoJSON, MetroStationsGeoJSON } from './types';

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

function segmentLength(a: [number, number], b: [number, number]) {
	return haversineM(a, b);
}

/** Fraction 0–1 along total line length → coordinate */
export function pointAtLinePosition(
	coords: [number, number][],
	fraction: number
): [number, number] {
	if (coords.length === 0) return [0, 0];
	if (coords.length === 1) return coords[0];

	const segments: { a: [number, number]; b: [number, number]; len: number }[] = [];
	let total = 0;
	for (let i = 0; i < coords.length - 1; i++) {
		const len = segmentLength(coords[i], coords[i + 1]);
		segments.push({ a: coords[i], b: coords[i + 1], len });
		total += len;
	}
	if (total === 0) return coords[0];

	const target = Math.max(0, Math.min(1, fraction)) * total;
	let walked = 0;
	for (const seg of segments) {
		if (walked + seg.len >= target) {
			const t = seg.len === 0 ? 0 : (target - walked) / seg.len;
			return [seg.a[0] + t * (seg.b[0] - seg.a[0]), seg.a[1] + t * (seg.b[1] - seg.a[1])];
		}
		walked += seg.len;
	}
	return coords[coords.length - 1];
}

/** Nearest point on line → fraction along total length */
export function linePositionAtPoint(
	coords: [number, number][],
	point: [number, number]
): number {
	if (coords.length < 2) return 0;

	let total = 0;
	const segData: { len: number; a: [number, number]; b: [number, number] }[] = [];
	for (let i = 0; i < coords.length - 1; i++) {
		const len = segmentLength(coords[i], coords[i + 1]);
		segData.push({ len, a: coords[i], b: coords[i + 1] });
		total += len;
	}
	if (total === 0) return 0;

	let bestDist = Infinity;
	let bestFraction = 0;
	let walked = 0;

	for (const seg of segData) {
		const [ax, ay] = seg.a;
		const [bx, by] = seg.b;
		const [px, py] = point;
		const dx = bx - ax;
		const dy = by - ay;
		const lenSq = dx * dx + dy * dy;
		let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
		t = Math.max(0, Math.min(1, t));
		const proj: [number, number] = [ax + t * dx, ay + t * dy];
		const dist = haversineM(point, proj);
		if (dist < bestDist) {
			bestDist = dist;
			bestFraction = (walked + t * seg.len) / total;
		}
		walked += seg.len;
	}

	return bestFraction;
}

export type SnapAttachment = {
	lng: number;
	lat: number;
	snapped: boolean;
	distanceM: number;
	attachedLineId?: string;
	linePosition?: number;
};

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

/** Snap with line attachment metadata for simplify reprojection */
export function snapWithAttachment(
	lng: number,
	lat: number,
	lines: MetroGeoJSON,
	simplified: MetroGeoJSON | null | undefined,
	thresholdMeters: number
): SnapAttachment {
	const collections = [simplified, lines].filter(Boolean) as MetroGeoJSON[];
	let best: SnapAttachment = { lng, lat, snapped: false, distanceM: Infinity };

	for (const collection of collections) {
		for (const feature of collection.features) {
			const lineId = feature.properties.id;
			const coords = feature.geometry.coordinates as [number, number][];
			for (let i = 0; i < coords.length - 1; i++) {
				const [nx, ny, dist] = nearestOnSegment([lng, lat], coords[i], coords[i + 1]);
				if (dist < best.distanceM) {
					const linePosition = linePositionAtPoint(coords, [nx, ny]);
					best = {
						lng: nx,
						lat: ny,
						snapped: dist <= thresholdMeters,
						distanceM: dist,
						attachedLineId: lineId,
						linePosition
					};
				}
			}
		}
	}

	if (!best.snapped) {
		return { lng, lat, snapped: false, distanceM: best.distanceM };
	}
	return best;
}

/** Move attached stations onto simplified (or geographic) lines */
export function reprojectAttachedStations(
	stations: MetroStationsGeoJSON,
	lines: MetroGeoJSON
): MetroStationsGeoJSON {
	return {
		type: 'FeatureCollection',
		features: stations.features.map((station) => {
			const { attachedLineId, linePosition } = station.properties;
			if (!attachedLineId || linePosition == null) return station;

			const line = lines.features.find((f) => f.properties.id === attachedLineId);
			if (!line || line.geometry.coordinates.length < 2) return station;

			const coords = pointAtLinePosition(
				line.geometry.coordinates as [number, number][],
				linePosition
			);

			return {
				...station,
				geometry: { type: 'Point' as const, coordinates: coords }
			};
		})
	};
}
