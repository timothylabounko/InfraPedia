import { DEFAULT_LINE_STYLE_ID, getLineStyle } from './line-styles';
import { materializeCornerVertices } from './line-curves';
import { syncVertexRoundnessLength } from './line-edit';
import type { MetroGeoJSON, MetroLineFeature } from './types';

const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function toRadians(deg: number) {
	return (deg * Math.PI) / 180;
}

function toDegrees(rad: number) {
	return (rad * 180) / Math.PI;
}

function snapAngle(degrees: number) {
	const normalized = ((degrees % 360) + 360) % 360;
	let best = SNAP_ANGLES[0];
	let bestDiff = 360;

	for (const angle of SNAP_ANGLES) {
		const diff = Math.min(Math.abs(normalized - angle), 360 - Math.abs(normalized - angle));
		if (diff < bestDiff) {
			bestDiff = diff;
			best = angle;
		}
	}

	return best;
}

function destination(
	lon: number,
	lat: number,
	bearingDeg: number,
	distanceKm: number
): [number, number] {
	const R = 6371;
	const bearing = toRadians(bearingDeg);
	const lat1 = toRadians(lat);
	const lon1 = toRadians(lon);

	const lat2 = Math.asin(
		Math.sin(lat1) * Math.cos(distanceKm / R) +
			Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearing)
	);
	const lon2 =
		lon1 +
		Math.atan2(
			Math.sin(bearing) * Math.sin(distanceKm / R) * Math.cos(lat1),
			Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
		);

	return [toDegrees(lon2), toDegrees(lat2)];
}

function haversineKm(a: [number, number], b: [number, number]) {
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;
	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lon2 - lon1);
	const x =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.sqrt(x));
}

function bearing(a: [number, number], b: [number, number]) {
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;
	const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
	const x =
		Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
		Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
	return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/** Simplify a line to 45°/90° schematic segments while preserving overall shape */
export function simplifyLineString(coords: [number, number][]): [number, number][] {
	if (coords.length < 2) return coords;

	const simplified: [number, number][] = [coords[0]];
	let current = coords[0];

	for (let i = 1; i < coords.length; i++) {
		const target = coords[i];
		const dist = haversineKm(current, target);
		if (dist < 0.05) continue;

		const rawBearing = bearing(current, target);
		const snapped = snapAngle(rawBearing);
		const next = destination(current[0], current[1], snapped, dist);
		simplified.push(next);
		current = next;

		if (i === coords.length - 1 && (next[0] !== target[0] || next[1] !== target[1])) {
			simplified.push(target);
		}
	}

	return simplified;
}

export function simplifyMetroMap(geojson: MetroGeoJSON): MetroGeoJSON {
	return {
		type: 'FeatureCollection',
		features: geojson.features.map((feature: MetroLineFeature, index: number) => {
			const coords = feature.geometry.coordinates as [number, number][];
			const style = getLineStyle(feature.properties?.styleId ?? DEFAULT_LINE_STYLE_ID);
			const curvature = feature.properties?.curvature ?? style.curvature ?? 'straight';
			const simplifiedCoords = materializeCornerVertices(simplifyLineString(coords));
			return {
				...feature,
				properties: {
					id: feature.properties?.id ?? `line-${index}`,
					color: feature.properties?.color ?? style.color,
					styleId: feature.properties?.styleId ?? style.id,
					weight: feature.properties?.weight ?? style.weight,
					dashArray: feature.properties?.dashArray ?? style.dashArray,
					lineCap: feature.properties?.lineCap ?? style.lineCap,
					lineJoin: feature.properties?.lineJoin ?? style.lineJoin,
					casingColor: feature.properties?.casingColor ?? style.casingColor,
					casingExtra: feature.properties?.casingExtra ?? style.casingExtra,
					curvature,
					edgeType: feature.properties?.edgeType ?? style.edgeType,
					snapToStreets: feature.properties?.snapToStreets,
					vertexRoundness: syncVertexRoundnessLength(
						feature.properties?.vertexRoundness,
						coords.length,
						simplifiedCoords.length
					),
					name: feature.properties?.name
				},
				geometry: {
					type: 'LineString',
					coordinates: simplifiedCoords
				}
			};
		})
	};
}

export function emptyMetroGeoJSON(): MetroGeoJSON {
	return { type: 'FeatureCollection', features: [] };
}

export function emptyStationsGeoJSON(): import('./types').MetroStationsGeoJSON {
	return { type: 'FeatureCollection', features: [] };
}

export function emptyPolygonsGeoJSON(): import('./types').MapPolygonsGeoJSON {
	return { type: 'FeatureCollection', features: [] };
}

export function newLineId() {
	return crypto.randomUUID();
}
