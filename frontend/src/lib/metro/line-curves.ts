import type { LineCurvature } from './types';
import { defaultRoundnessForCurvature } from './line-edit';

type Point = [number, number];

function dist(a: Point, b: Point) {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	return Math.hypot(dx, dy);
}

function sub(a: Point, b: Point): Point {
	return [a[0] - b[0], a[1] - b[1]];
}

function add(a: Point, b: Point): Point {
	return [a[0] + b[0], a[1] + b[1]];
}

function scale(v: Point, s: number): Point {
	return [v[0] * s, v[1] * s];
}

function midpoint(a: Point, b: Point): Point {
	return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function pushIfDistinct(out: Point[], p: Point, minDist = 1e-10) {
	const last = out[out.length - 1];
	if (!last || dist(last, p) > minDist) out.push(p);
}

function minDistinctDistance(points: Point[]) {
	let span = 0;
	for (let i = 1; i < points.length; i++) {
		span = Math.max(span, dist(points[i - 1], points[i]));
	}
	return Math.max(1e-12, span * 1e-8);
}

/** Read explicit per-vertex roundness only (0 = sharp). */
export function roundnessAtIndex(
	index: number,
	_vertexCurvature?: LineCurvature,
	vertexRoundness?: number[]
): number {
	return vertexRoundness?.[index] ?? 0;
}

function lerp(a: Point, b: Point, t: number): Point {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** 0–1 from signed percent. */
function normalizePct(pct: number) {
	return Math.max(0, Math.min(1, Math.abs(pct) / 100));
}

/**
 * How much curve blends in — sqrt so low values already show a tight round.
 */
function blendStrength(x: number) {
	if (x <= 0) return 0;
	return Math.sqrt(x);
}

/** Quadratic sample for a given control point. */
function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
	const u = 1 - t;
	return [
		u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
		u * u * start[1] + 2 * u * t * control[1] + t * t * end[1]
	];
}

/**
 * Bezier control for one corner.
 * Positive: tight arc near corner at low %, fully rounded at +100.
 * Negative: inverted bulge hugging the corner (not mirrored far away).
 */
function controlForCorner(start: Point, corner: Point, end: Point, pct: number): Point {
	const chordMid = midpoint(start, end);
	const amount = normalizePct(pct);

	if (pct >= 0) {
		const tight = lerp(chordMid, corner, 0.42);
		const full = corner;
		return lerp(tight, full, amount);
	}

	// Negative: bow inward; −100% mirrors the corner across the chord (fully inverted).
	const cornerOffset = sub(corner, chordMid);
	const tight = lerp(corner, chordMid, 0.12);
	const full = sub(chordMid, cornerOffset);
	return lerp(tight, full, amount);
}

/** Point along the original sharp path start → corner → end (t ∈ 0..1). */
function pointOnSharpPath(start: Point, corner: Point, end: Point, t: number): Point {
	if (t <= 0.5) return lerp(start, corner, t * 2);
	return lerp(corner, end, (t - 0.5) * 2);
}

/**
 * Smooth curve between the two neighbours of a selected corner.
 * 0% = exact original sharp path. Low % = tight visible round. ±100% = full extreme.
 */
export function roundedSegment(
	start: Point,
	corner: Point,
	end: Point,
	roundnessPct: number,
	steps = 28
): Point[] {
	const pct = Math.max(-100, Math.min(100, roundnessPct));
	if (Math.abs(pct) < 0.5) return [start, corner, end];

	const amount = normalizePct(pct);
	const blend = blendStrength(amount);
	const control = controlForCorner(start, corner, end, pct);

	const pts: Point[] = [];
	const minDist = minDistinctDistance([start, corner, end]);
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const sharp = pointOnSharpPath(start, corner, end, t);
		const curved = quadraticPoint(start, control, end, t);
		pushIfDistinct(pts, lerp(sharp, curved, blend), minDist);
	}
	return pts.length >= 2 ? pts : [start, corner, end];
}

/** @deprecated — kept for API compat */
export type CornerCurveResult = {
	arcPoints: Point[];
	tangentStart: Point;
	tangentEnd: Point;
	sharpCorner: Point;
	roundness: number;
};

export function computeCornerCurve(
	prev: Point,
	corner: Point,
	next: Point,
	roundnessPct: number
): CornerCurveResult | null {
	const pct = Math.max(-100, Math.min(100, roundnessPct));
	if (Math.abs(pct) < 0.5) return null;
	const arcPoints = roundedSegment(prev, corner, next, pct);
	return {
		arcPoints,
		tangentStart: prev,
		tangentEnd: next,
		sharpCorner: corner,
		roundness: pct
	};
}

export function computeFillet(
	prev: Point,
	corner: Point,
	next: Point,
	roundnessPct: number
): CornerCurveResult | null {
	return computeCornerCurve(prev, corner, next, roundnessPct);
}

/**
 * Build display path. Rounded interior vertices are replaced by a curve
 * between their left & right neighbours, shaped by the corner point.
 */
export function applyCurvature(
	coords: Point[],
	_curvature?: LineCurvature,
	vertexRoundness?: number[]
): Point[] {
	if (coords.length < 3) return [...coords];
	if (!vertexRoundness?.some((v) => Math.abs(v ?? 0) >= 0.5)) return [...coords];

	const n = coords.length;
	const out: Point[] = [coords[0]];
	let i = 1;
	const minDist = minDistinctDistance(coords);

	while (i < n - 1) {
		const pct = roundnessAtIndex(i, undefined, vertexRoundness);
		const nextPct = i + 1 < n - 1 ? roundnessAtIndex(i + 1, undefined, vertexRoundness) : 0;

		if (Math.abs(pct) >= 0.5 && Math.abs(nextPct) >= 0.5 && i + 2 < n) {
			// Two consecutive rounded corners → one smooth cubic between outer neighbours.
			const curve = cubicRoundedSegment(
				coords[i - 1],
				coords[i],
				coords[i + 1],
				coords[i + 2],
				pct,
				nextPct
			);
			for (let j = 1; j < curve.length; j++) pushIfDistinct(out, curve[j], minDist);
			i += 3;
			continue;
		}

		if (Math.abs(pct) >= 0.5) {
			const curve = roundedSegment(coords[i - 1], coords[i], coords[i + 1], pct);
			for (let j = 1; j < curve.length; j++) pushIfDistinct(out, curve[j], minDist);
			i += 2;
			continue;
		}

		pushIfDistinct(out, coords[i], minDist);
		i += 1;
	}

	pushIfDistinct(out, coords[n - 1], minDist);
	return out;
}

/** Point along sharp path through four vertices. */
function pointOnSharpPath4(a: Point, b: Point, c: Point, d: Point, t: number): Point {
	const seg = t * 3;
	if (seg < 1) return lerp(a, b, seg);
	if (seg < 2) return lerp(b, c, seg - 1);
	return lerp(c, d, seg - 2);
}

/** Cubic sample for two control points. */
function cubicPoint(start: Point, cp1: Point, cp2: Point, end: Point, t: number): Point {
	const u = 1 - t;
	return [
		u * u * u * start[0] +
			3 * u * u * t * cp1[0] +
			3 * u * t * t * cp2[0] +
			t * t * t * end[0],
		u * u * u * start[1] +
			3 * u * u * t * cp1[1] +
			3 * u * t * t * cp2[1] +
			t * t * t * end[1]
	];
}

/** Cubic curve for two consecutive rounded corners (snake-friendly). */
function cubicRoundedSegment(
	start: Point,
	cornerA: Point,
	cornerB: Point,
	end: Point,
	roundnessA: number,
	roundnessB: number,
	steps = 28
): Point[] {
	const amountA = normalizePct(roundnessA);
	const amountB = normalizePct(roundnessB);
	const blend = blendStrength(Math.max(amountA, amountB));

	const cp1 = controlForCorner(start, cornerA, end, roundnessA);
	const cp2 = controlForCorner(start, cornerB, end, roundnessB);

	const pts: Point[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const sharp = pointOnSharpPath4(start, cornerA, cornerB, end, t);
		const curved = cubicPoint(start, cp1, cp2, end, t);
		pts.push(lerp(sharp, curved, blend));
	}
	return pts;
}

export function dedupeColinearVertices(coords: Point[], toleranceDeg = 4): Point[] {
	if (coords.length < 3) return coords;
	const out: Point[] = [coords[0]];
	for (let i = 1; i < coords.length - 1; i++) {
		const vIn = sub(coords[i], coords[i - 1]);
		const vOut = sub(coords[i + 1], coords[i]);
		const lenIn = Math.hypot(vIn[0], vIn[1]);
		const lenOut = Math.hypot(vOut[0], vOut[1]);
		if (lenIn < 1e-12 || lenOut < 1e-12) continue;
		const dot = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut);
		const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
		const deg = (theta * 180) / Math.PI;
		if (deg > toleranceDeg) out.push(coords[i]);
	}
	out.push(coords[coords.length - 1]);
	return out.length >= 2 ? out : coords;
}

export function materializeCornerVertices(coords: Point[]): Point[] {
	if (coords.length < 2) return coords;
	let result = dedupeColinearVertices(coords);
	if (result.length < 2) result = coords;
	return result;
}

export function initVertexRoundness(
	coordLength: number,
	curvature: LineCurvature,
	existing?: number[]
): number[] | undefined {
	if (coordLength < 3) return existing;
	if (curvature === 'straight' && !existing?.length) return undefined;

	const interior = defaultRoundnessForCurvature(curvature);
	const arr = Array.from({ length: coordLength }, (_, idx) => {
		if (existing?.[idx] != null) return existing[idx];
		if (idx === 0 || idx === coordLength - 1) return 0;
		return curvature === 'straight' ? 0 : interior;
	});
	return arr;
}

export function vertexRoundnessForLineCurvature(
	coordLength: number,
	curvature: LineCurvature
): number[] | undefined {
	if (coordLength < 3 || curvature === 'straight') return undefined;
	return initVertexRoundness(coordLength, curvature);
}
