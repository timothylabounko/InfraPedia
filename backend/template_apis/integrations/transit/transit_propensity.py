"""Corridor transit propensity analysis using US tract-level ACS commute data."""

from __future__ import annotations

import asyncio
import json
import math
from typing import Any

import httpx
from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import transform

from transit_settings import (
    CORRIDOR_BUFFER_METERS,
    COEFFICIENT_LABELS,
    DEFAULT_COEFFICIENTS,
    US_BOUNDS,
)
from ipums_client import data_source_label, verify_ipums_api_key
from tract_demographics import enrich_tract_features

NTAD_TRANSPORT_URL = (
    "https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/"
    "NTAD_Means_of_Transportation_to_Work/FeatureServer/0/query"
)

SCORE_COLORS = [
    (0.0, "#2166ac"),
    (0.25, "#67a9cf"),
    (0.5, "#fee090"),
    (0.75, "#f46d43"),
    (1.0, "#a50026"),
]


def _normalize_coefficients(coefficients: dict[str, float] | None) -> dict[str, float]:
    merged = {**DEFAULT_COEFFICIENTS}
    if coefficients:
        for key, value in coefficients.items():
            if key in merged:
                try:
                    merged[key] = float(value)
                except (TypeError, ValueError):
                    pass
    return merged


def _coords_in_us(coords: list[list[float]]) -> bool:
    for lon, lat in coords:
        if not (
            US_BOUNDS["south"] <= lat <= US_BOUNDS["north"]
            and US_BOUNDS["west"] <= lon <= US_BOUNDS["east"]
        ):
            return False
    return True


def _utm_crs_for_lon(lon: float) -> str:
    zone = int((lon + 180) / 6) + 1
    return f"EPSG:326{zone:02d}"


def _buffer_line_wgs84(line: LineString, meters: float) -> Any:
    lon = line.centroid.x
    crs = _utm_crs_for_lon(lon)
    to_utm = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform
    to_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform
    projected = transform(to_utm, line)
    buffered = projected.buffer(meters)
    return transform(to_wgs, buffered)


def _score_to_color(score: float) -> str:
    clamped = max(0.0, min(1.0, score))
    for index in range(len(SCORE_COLORS) - 1):
        low_score, low_color = SCORE_COLORS[index]
        high_score, high_color = SCORE_COLORS[index + 1]
        if clamped <= high_score:
            return low_color if clamped <= (low_score + high_score) / 2 else high_color
    return SCORE_COLORS[-1][1]


def _tract_metrics_from_properties(props: dict[str, Any]) -> dict[str, float]:
    def pct(field: str) -> float:
        value = props.get(field)
        if value is None:
            return 0.0
        try:
            return max(0.0, float(value)) / 100.0
        except (TypeError, ValueError):
            return 0.0

    total_workers = float(props.get("TOTAL") or 0)
    aland = float(props.get("ALAND") or 1)
    sq_km = max(aland / 1_000_000.0, 0.001)

    return {
        "transit_commute": pct("PT_P"),
        "walk_commute": pct("WL_P"),
        "no_vehicle": max(0.0, 1.0 - pct("CT_P")),
        "population_density": total_workers / sq_km,
        "median_income": pct("CA_P"),
        "renter_occupied": pct("OTHER_P"),
    }


def _normalize_features(
    tract_metrics: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    keys = list(DEFAULT_COEFFICIENTS.keys())
    mins = {key: math.inf for key in keys}
    maxs = {key: -math.inf for key in keys}

    for metrics in tract_metrics.values():
        for key in keys:
            value = metrics[key]
            mins[key] = min(mins[key], value)
            maxs[key] = max(maxs[key], value)

    normalized: dict[str, dict[str, float]] = {}
    for geoid, metrics in tract_metrics.items():
        normalized[geoid] = {}
        for key in keys:
            span = maxs[key] - mins[key]
            if span <= 0:
                normalized[geoid][key] = 0.5
            else:
                normalized[geoid][key] = (metrics[key] - mins[key]) / span
    return normalized


def _tract_score(
    normalized: dict[str, float],
    coefficients: dict[str, float],
) -> float:
    weighted_sum = 0.0
    weight_total = 0.0
    for key, coef in coefficients.items():
        if key not in normalized:
            continue
        value = normalized[key]
        if coef < 0:
            value = 1.0 - value
        magnitude = abs(coef)
        weighted_sum += value * magnitude
        weight_total += magnitude
    if weight_total <= 0:
        return 0.0
    return max(0.0, min(1.0, weighted_sum / weight_total))


async def _fetch_adjacent_tracts(buffer_geom: Any) -> dict[str, Any]:
    bounds = buffer_geom.bounds
    pad = max(0.015, (bounds[2] - bounds[0]) * 0.25, (bounds[3] - bounds[1]) * 0.25)
    envelope = {
        "xmin": bounds[0] - pad,
        "ymin": bounds[1] - pad,
        "xmax": bounds[2] + pad,
        "ymax": bounds[3] + pad,
        "spatialReference": {"wkid": 4326},
    }
    params = {
        "geometry": json.dumps(envelope),
        "geometryType": "esriGeometryEnvelope",
        "inSR": 4326,
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": (
            "GEOID,STATEFP,COUNTYFP,TRACTCE,NAME,ALAND,TOTAL,"
            "PT_P,WL_P,CT_P,CA_P,OTHER_P"
        ),
        "returnGeometry": "true",
        "f": "geojson",
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.get(NTAD_TRANSPORT_URL, params=params)
    response.raise_for_status()
    payload = response.json()
    features = []
    for feature in payload.get("features", []):
        geom = shape(feature["geometry"])
        if buffer_geom.intersects(geom):
            features.append(feature)
    return {"type": "FeatureCollection", "features": features}


def _build_scored_corridor(
    corridor: dict[str, Any],
    tract_features: list[dict[str, Any]],
    tract_scores: dict[str, float],
) -> dict[str, Any]:
    line = shape(corridor["geometry"])
    coords = list(line.coords)
    segments = []

    tract_shapes = [
        (feature["properties"].get("GEOID"), shape(feature["geometry"]))
        for feature in tract_features
    ]

    for index in range(len(coords) - 1):
        start = coords[index]
        end = coords[index + 1]
        midpoint = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
        point = Point(midpoint)
        score = 0.5
        for geoid, tract_geom in tract_shapes:
            if geoid and (tract_geom.contains(point) or tract_geom.distance(point) < 0.002):
                score = tract_scores.get(geoid, score)
                break
        else:
            if tract_shapes:
                nearest_geoid = min(
                    tract_shapes,
                    key=lambda item: item[1].distance(point),
                )[0]
                score = tract_scores.get(nearest_geoid, 0.5)

        segments.append(
            {
                "type": "Feature",
                "properties": {
                    "transit_propensity_score": round(score, 4),
                    "color": _score_to_color(score),
                    "segment_index": index,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [start, end],
                },
            }
        )

    return {"type": "FeatureCollection", "features": segments}


async def analyze_corridor(
    corridor_geojson: dict[str, Any],
    coefficients: dict[str, float] | None = None,
    recalculate: bool = False,
) -> dict[str, Any]:
    ipums_ok, ipums_message = await verify_ipums_api_key()
    if not ipums_ok:
        return {"status": "error", "message": ipums_message}

    coeffs = _normalize_coefficients(coefficients)

    if corridor_geojson.get("type") == "Feature":
        geometry = corridor_geojson.get("geometry")
    elif corridor_geojson.get("type") == "LineString":
        geometry = corridor_geojson
    else:
        return {
            "status": "error",
            "message": "Expected a GeoJSON LineString or Feature with a line geometry.",
        }

    if not geometry or geometry.get("type") != "LineString":
        return {
            "status": "error",
            "message": "Corridor must be a LineString. Draw a line on the map first.",
        }

    coords = geometry.get("coordinates", [])
    if len(coords) < 2:
        return {
            "status": "error",
            "message": "Corridor must have at least two points.",
        }

    if not _coords_in_us(coords):
        return {
            "status": "error",
            "message": "This corridor was drawn outside the United States. Draw a new line within the US and try again.",
        }

    line = LineString(coords)
    buffer_geom = _buffer_line_wgs84(line, CORRIDOR_BUFFER_METERS)

    try:
        tract_collection = await _fetch_adjacent_tracts(buffer_geom)
    except httpx.HTTPError:
        return {
            "status": "error",
            "message": "Could not load census tract data for this corridor.",
        }

    tract_features = tract_collection.get("features", [])
    if not tract_features:
        return {
            "status": "error",
            "message": "No census tracts found near this corridor. Try drawing a longer line in a metro area.",
        }

    tract_metrics: dict[str, dict[str, float]] = {}
    for feature in tract_features:
        geoid = feature["properties"].get("GEOID")
        if not geoid:
            continue
        tract_metrics[geoid] = _tract_metrics_from_properties(feature["properties"])

    normalized = _normalize_features(tract_metrics)
    tract_scores = {
        geoid: round(_tract_score(normalized[geoid], coeffs), 4)
        for geoid in tract_metrics
    }

    output_tracts = {
        "type": "FeatureCollection",
        "features": [],
    }
    for feature in tract_features:
        geoid = feature["properties"].get("GEOID")
        if geoid not in tract_scores:
            continue
        score = tract_scores[geoid]
        output_tracts["features"].append(
            {
                **feature,
                "properties": {
                    **feature.get("properties", {}),
                    "transit_propensity_score": score,
                    "color": _score_to_color(score),
                },
            }
        )

    scored_corridor = _build_scored_corridor(
        {"geometry": geometry},
        tract_features,
        tract_scores,
    )

    output_tracts["features"] = await enrich_tract_features(output_tracts["features"])

    tract_count = len(output_tracts["features"])
    verb = "Recalculated" if recalculate else "Completed"
    return {
        "status": "success",
        "message": (
            f"{verb} transit propensity analysis for {tract_count} adjacent census tracts. "
            f"{ipums_message} {data_source_label()}."
        ),
        "coefficients": coeffs,
        "coefficient_labels": COEFFICIENT_LABELS,
        "data_source": data_source_label(),
        "analysis_type": "corridor",
        "inputs": {
            "corridor": {
                "type": "Feature",
                "properties": {"name": "user_corridor"},
                "geometry": geometry,
            }
        },
        "outputs": {
            "adjacent_tracts": output_tracts,
            "scored_corridor": scored_corridor,
        },
    }


def analyze_corridor_sync(
    corridor_geojson: dict[str, Any],
    coefficients: dict[str, float] | None = None,
    recalculate: bool = False,
) -> dict[str, Any]:
    return asyncio.run(
        analyze_corridor(corridor_geojson, coefficients, recalculate)
    )
