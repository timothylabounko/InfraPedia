import type { LineCurvature } from './line-styles';
import type { MetroGeoJSON } from './types';

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

/** Nearest point on segment ab to point p; returns [lng, lat, distanceMeters] */
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
	if (lenSq === 0) {
		return [ax, ay, haversineM(p, a)];
	}
	let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	const proj: [number, number] = [ax + t * dx, ay + t * dy];
	return [proj[0], proj[1], haversineM(p, proj)];
}

export type SnapResult = {
	lng: number;
	lat: number;
	snapped: boolean;
	distanceM: number;
};

/** Snap a click to the nearest metro line within thresholdMeters */
export function snapToLines(
	lng: number,
	lat: number,
	lines: MetroGeoJSON,
	simplified: MetroGeoJSON | null | undefined,
	thresholdMeters: number
): SnapResult {
	const collections = [lines, simplified].filter(Boolean) as MetroGeoJSON[];
	let best: SnapResult = { lng, lat, snapped: false, distanceM: Infinity };

	for (const collection of collections) {
		for (const feature of collection.features) {
			const coords = feature.geometry.coordinates;
			for (let i = 0; i < coords.length - 1; i++) {
				const [nx, ny, dist] = nearestOnSegment(
					[lng, lat],
					coords[i] as [number, number],
					coords[i + 1] as [number, number]
				);
				if (dist < best.distanceM) {
					best = {
						lng: nx,
						lat: ny,
						snapped: dist <= thresholdMeters,
						distanceM: dist
					};
				}
			}
		}
	}

	if (best.snapped) return best;
	return { lng, lat, snapped: false, distanceM: best.distanceM };
}

/** Insert curve midpoints for gentler rendering */
export function applyCurvature(
	coords: [number, number][],
	curvature: LineCurvature
): [number, number][] {
	if (coords.length < 3 || curvature === 'straight') return coords;

	const out: [number, number][] = [coords[0]];
	for (let i = 1; i < coords.length - 1; i++) {
		const prev = coords[i - 1];
		const curr = coords[i];
		const next = coords[i + 1];
		const t = curvature === 'smooth' ? 0.35 : 0.2;

		out.push([
			curr[0] + (prev[0] - curr[0]) * t * 0.5 + (next[0] - curr[0]) * t * 0.5,
			curr[1] + (prev[1] - curr[1]) * t * 0.5 + (next[1] - curr[1]) * t * 0.5
		]);
		out.push(curr);
	}
	out.push(coords[coords.length - 1]);
	return out;
}

export function snapThresholdForZoom(zoom: number): number {
	return Math.max(15, 1200 / Math.pow(2, zoom - 10));
}

// Re-export attachment helpers used by editor
export { snapWithAttachment, reprojectAttachedStations } from './station-attachment';
export type { SnapAttachment } from './station-attachment';
