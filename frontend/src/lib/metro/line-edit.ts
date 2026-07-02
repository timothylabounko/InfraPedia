import type { LineCurvature, LineProperties, MetroGeoJSON, MetroLineFeature } from './types';

export type CornerRoundness = 'sharp' | 'medium' | 'round' | 'smooth';

export function cornerRoundnessToCurvature(roundness: CornerRoundness): LineCurvature {
	switch (roundness) {
		case 'sharp':
			return 'straight';
		case 'medium':
			return 'gentle';
		case 'round':
			return 'gentle';
		case 'smooth':
			return 'smooth';
	}
}

export function curvatureToCornerRoundness(curvature?: LineCurvature): CornerRoundness {
	if (curvature === 'smooth') return 'smooth';
	if (curvature === 'gentle') return 'medium';
	return 'sharp';
}

export function roundnessStrength(roundness: CornerRoundness): number {
	switch (roundness) {
		case 'sharp':
			return 0;
		case 'medium':
			return 0.2;
		case 'round':
			return 0.35;
		case 'smooth':
			return 0.35;
	}
}

export function activeLineCollection(
	mapState: { lines: MetroGeoJSON; simplifiedLines: MetroGeoJSON | null },
	isSchematic: boolean
): MetroGeoJSON {
	if (isSchematic && mapState.simplifiedLines?.features.length) {
		return mapState.simplifiedLines;
	}
	return mapState.lines;
}

export function findLineFeature(
	collection: MetroGeoJSON,
	lineId: string
): MetroLineFeature | undefined {
	return collection.features.find((f) => f.properties.id === lineId);
}

export function updateLineInCollection(
	collection: MetroGeoJSON,
	lineId: string,
	coordinates: [number, number][],
	propertyPatch?: Partial<LineProperties>
): MetroGeoJSON {
	return {
		type: 'FeatureCollection',
		features: collection.features.map((f) => {
			if (f.properties.id !== lineId) return f;
			const oldCoords = f.geometry.coordinates as [number, number][];
			const vertexRoundness =
				propertyPatch && 'vertexRoundness' in propertyPatch
					? propertyPatch.vertexRoundness
					: syncVertexRoundnessLength(
							f.properties.vertexRoundness,
							oldCoords.length,
							coordinates.length,
							f.properties.curvature
						);
			const { vertexRoundness: _ignored, ...restPatch } = propertyPatch ?? {};
			return {
				...f,
				properties: { ...f.properties, ...restPatch, vertexRoundness },
				geometry: { type: 'LineString', coordinates }
			};
		})
	};
}

export function insertVertexAt(
	coordinates: [number, number][],
	segmentIndex: number,
	point: [number, number]
): [number, number][] {
	const next = [...coordinates];
	next.splice(segmentIndex + 1, 0, point);
	return next;
}

export function removeVertexAt(coordinates: [number, number][], index: number): [number, number][] {
	if (coordinates.length <= 2) return coordinates;
	return coordinates.filter((_, i) => i !== index);
}

export function extendLineEnd(
	coordinates: [number, number][],
	end: 'start' | 'end',
	point: [number, number]
): [number, number][] {
	return end === 'start' ? [point, ...coordinates] : [...coordinates, point];
}

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

function pointToSegmentDistanceM(
	p: [number, number],
	a: [number, number],
	b: [number, number]
) {
	const [px, py] = p;
	const [ax, ay] = a;
	const [bx, by] = b;
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return haversineM(p, a);
	let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	const proj: [number, number] = [ax + t * dx, ay + t * dy];
	return haversineM(p, proj);
}

/** Project point onto segment; returns [lng, lat, distanceM, segmentT] */
export function projectPointOnSegment(
	p: [number, number],
	a: [number, number],
	b: [number, number]
): [number, number, number, number] {
	const [px, py] = p;
	const [ax, ay] = a;
	const [bx, by] = b;
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return [ax, ay, haversineM(p, a), 0];
	let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	const proj: [number, number] = [ax + t * dx, ay + t * dy];
	return [proj[0], proj[1], haversineM(p, proj), t];
}

export type SegmentPick = {
	lineId: string;
	segmentIndex: number;
	point: [number, number];
	distanceM: number;
};

/** Pick the nearest line segment at a map click */
export function pickSegmentAtPoint(
	collection: MetroGeoJSON,
	lng: number,
	lat: number,
	thresholdM: number
): SegmentPick | null {
	let best: SegmentPick | null = null;

	for (const feature of collection.features) {
		const coords = feature.geometry.coordinates as [number, number][];
		for (let i = 0; i < coords.length - 1; i++) {
			const [nx, ny, dist] = projectPointOnSegment([lng, lat], coords[i], coords[i + 1]);
			if (dist <= thresholdM && (!best || dist < best.distanceM)) {
				best = {
					lineId: feature.properties.id,
					segmentIndex: i,
					point: [nx, ny],
					distanceM: dist
				};
			}
		}
	}

	return best;
}

/** Pick the line nearest to a map click */
export function pickLineAtPoint(
	collection: MetroGeoJSON,
	lng: number,
	lat: number,
	thresholdM: number
): string | null {
	let bestId: string | null = null;
	let bestDist = Infinity;

	for (const feature of collection.features) {
		const coords = feature.geometry.coordinates as [number, number][];
		for (let i = 0; i < coords.length - 1; i++) {
			const dist = pointToSegmentDistanceM([lng, lat], coords[i], coords[i + 1]);
			if (dist < bestDist) {
				bestDist = dist;
				bestId = feature.properties.id;
			}
		}
	}

	return bestDist <= thresholdM ? bestId : null;
}

/** Nearest segment index for inserting a midpoint */
export function nearestSegmentIndex(
	coordinates: [number, number][],
	lng: number,
	lat: number
): number {
	let bestIdx = 0;
	let bestDist = Infinity;
	for (let i = 0; i < coordinates.length - 1; i++) {
		const dist = pointToSegmentDistanceM([lng, lat], coordinates[i], coordinates[i + 1]);
		if (dist < bestDist) {
			bestDist = dist;
			bestIdx = i;
		}
	}
	return bestIdx;
}

export function midpoint(a: [number, number], b: [number, number]): [number, number] {
	return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function vertexRoundnessForIndex(
	props: { vertexRoundness?: number[]; curvature?: LineCurvature },
	index: number,
	_coordLength: number
): number {
	return props.vertexRoundness?.[index] ?? 0;
}

export function defaultRoundnessForCurvature(curvature: LineCurvature): number {
	switch (curvature) {
		case 'smooth':
			return 100;
		case 'gentle':
			return 55;
		default:
			return 0;
	}
}

export function withVertexRoundness(
	existing: number[] | undefined,
	index: number,
	value: number,
	coordLength: number,
	_fallbackCurvature?: LineCurvature
): number[] | undefined {
	const next = [...(existing ?? Array.from({ length: coordLength }, () => 0))];
	while (next.length < coordLength) next.push(0);
	next[index] = Math.max(-100, Math.min(100, Math.round(value)));
	if (!next.some((v) => Math.abs(v) >= 0.5)) return undefined;
	return next;
}

export function syncVertexRoundnessLength(
	existing: number[] | undefined,
	oldLength: number,
	newLength: number,
	_curvature?: LineCurvature
): number[] | undefined {
	if (newLength === oldLength) return existing;
	const next = [...(existing ?? Array.from({ length: oldLength }, () => 0))];
	while (next.length < oldLength) next.push(0);
	if (newLength > oldLength) {
		const insertCount = newLength - oldLength;
		for (let i = 0; i < insertCount; i++) next.push(0);
	}
	return next.slice(0, newLength);
}
