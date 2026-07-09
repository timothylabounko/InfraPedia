"""Station walk-shed transit propensity analysis."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import unary_union

from transit_settings import (
    COEFFICIENT_LABELS,
    DEFAULT_COEFFICIENTS,
    DEFAULT_WALK_MINUTES,
    WALK_SPEED_M_PER_MIN,
)
from ipums_client import data_source_label, verify_ipums_api_key
from tract_demographics import enrich_tract_features
from transit_propensity import (
    _coords_in_us,
    _fetch_adjacent_tracts,
    _normalize_coefficients,
    _normalize_features,
    _score_to_color,
    _tract_metrics_from_properties,
    _tract_score,
    _utm_crs_for_lon,
)
from pyproj import Transformer
from shapely.ops import transform


def _extract_corridor_geometry(corridor_geojson: dict[str, Any]) -> dict[str, Any] | None:
    if corridor_geojson.get("type") == "Feature":
        return corridor_geojson.get("geometry")
    if corridor_geojson.get("type") == "LineString":
        return corridor_geojson
    return None


def _buffer_point_wgs84(lng: float, lat: float, meters: float) -> Any:
    point = Point(lng, lat)
    crs = _utm_crs_for_lon(lng)
    to_utm = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform
    to_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform
    projected = transform(to_utm, point)
    buffered = projected.buffer(meters)
    return transform(to_wgs, buffered)


def _population_estimate(props: dict[str, Any]) -> float:
    workers = float(props.get("TOTAL") or 0)
    if workers > 0:
        return workers * 1.5
    return 0.0


async def analyze_stations(
    corridor_geojson: dict[str, Any],
    stations: list[dict[str, Any]],
    coefficients: dict[str, float] | None = None,
    recalculate: bool = False,
) -> dict[str, Any]:
    ipums_ok, ipums_message = await verify_ipums_api_key()
    if not ipums_ok:
        return {"status": "error", "message": ipums_message}

    coeffs = _normalize_coefficients(coefficients)
    geometry = _extract_corridor_geometry(corridor_geojson)

    if not geometry or geometry.get("type") != "LineString":
        return {
            "status": "error",
            "message": "Draw a corridor on the map before adding stations.",
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
            "message": "This corridor was drawn outside the United States.",
        }

    if not stations:
        return {
            "status": "error",
            "message": "Add at least one station on the corridor (Add station tool), then run analysis station.",
        }

    line = LineString(coords)
    station_points: list[dict[str, Any]] = []
    buffer_geoms = []

    for index, station in enumerate(stations):
        lng = float(station["lng"])
        lat = float(station["lat"])
        if not _coords_in_us([[lng, lat]]):
            return {
                "status": "error",
                "message": f"Station {index + 1} is outside the United States.",
            }

        walk_minutes = float(station.get("walk_minutes") or DEFAULT_WALK_MINUTES)
        walk_minutes = max(1.0, min(walk_minutes, 60.0))
        buffer_meters = walk_minutes * WALK_SPEED_M_PER_MIN
        point = Point(lng, lat)

        if point.distance(line) > 0.003:
            return {
                "status": "error",
                "message": (
                    f"Station {index + 1} must be placed on the corridor line."
                ),
            }

        buffer_geom = _buffer_point_wgs84(lng, lat, buffer_meters)
        buffer_geoms.append(buffer_geom)
        station_points.append(
            {
                "station": station,
                "point": point,
                "walk_minutes": walk_minutes,
                "buffer_geom": buffer_geom,
                "buffer_meters": buffer_meters,
            }
        )

    combined_buffer = unary_union(buffer_geoms)

    try:
        tract_collection = await _fetch_adjacent_tracts(combined_buffer)
    except httpx.HTTPError:
        return {
            "status": "error",
            "message": "Could not load census tract data for station analysis.",
        }

    tract_features = tract_collection.get("features", [])
    if not tract_features:
        return {
            "status": "error",
            "message": "No census tracts found near these stations.",
        }

    tract_metrics: dict[str, dict[str, float]] = {}
    for feature in tract_features:
        geoid = feature["properties"].get("GEOID")
        if geoid:
            tract_metrics[geoid] = _tract_metrics_from_properties(feature["properties"])

    normalized = _normalize_features(tract_metrics)
    tract_scores = {
        geoid: _tract_score(normalized[geoid], coeffs) for geoid in tract_metrics
    }

    station_feature_rows = []
    buffer_feature_rows = []
    service_tract_rows = []
    seen_tracts: set[str] = set()

    for entry in station_points:
        station = entry["station"]
        buffer_geom = entry["buffer_geom"]
        walk_minutes = entry["walk_minutes"]
        lng = float(station["lng"])
        lat = float(station["lat"])

        population = 0.0
        score_weighted = 0.0

        for feature in tract_features:
            geoid = feature["properties"].get("GEOID")
            if not geoid or geoid not in tract_scores:
                continue

            tract_geom = shape(feature["geometry"])
            if tract_geom.area <= 0:
                continue

            intersection = buffer_geom.intersection(tract_geom)
            if intersection.is_empty:
                continue

            fraction = intersection.area / tract_geom.area
            if fraction <= 0:
                continue

            pop = _population_estimate(feature["properties"]) * fraction
            score = tract_scores[geoid]
            population += pop
            score_weighted += score * pop

            if geoid not in seen_tracts:
                seen_tracts.add(geoid)
                service_tract_rows.append(
                    {
                        **feature,
                        "properties": {
                            **feature.get("properties", {}),
                            "transit_propensity_score": round(score, 4),
                            "color": _score_to_color(score),
                        },
                    }
                )

        station_score = score_weighted / population if population > 0 else 0.5
        station_score = round(max(0.0, min(1.0, station_score)), 4)

        station_id = station.get("id") or f"station-{len(station_feature_rows) + 1}"
        station_feature_rows.append(
            {
                "type": "Feature",
                "properties": {
                    "station_id": station_id,
                    "walk_minutes": walk_minutes,
                    "buffer_meters": round(entry["buffer_meters"], 1),
                    "transit_propensity_score": station_score,
                    "population_reached": round(population),
                    "color": _score_to_color(station_score),
                },
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
            }
        )
        buffer_feature_rows.append(
            {
                "type": "Feature",
                "properties": {
                    "station_id": station_id,
                    "walk_minutes": walk_minutes,
                    "transit_propensity_score": station_score,
                    "population_reached": round(population),
                    "color": _score_to_color(station_score),
                    "fillColor": _score_to_color(station_score),
                },
                "geometry": mapping(buffer_geom),
            }
        )

    service_tract_rows = await enrich_tract_features(service_tract_rows)

    verb = "Recalculated" if recalculate else "Completed"
    total_pop = sum(
        row["properties"]["population_reached"] for row in station_feature_rows
    )

    return {
        "status": "success",
        "message": (
            f"{verb} station analysis for {len(station_feature_rows)} point(s) "
            f"reaching ~{total_pop:,} people in walk sheds. {ipums_message} "
            f"{data_source_label()}."
        ),
        "coefficients": coeffs,
        "coefficient_labels": COEFFICIENT_LABELS,
        "data_source": data_source_label(),
        "analysis_type": "station",
        "inputs": {
            "corridor": {
                "type": "Feature",
                "properties": {"name": "user_corridor"},
                "geometry": geometry,
            },
            "stations": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {
                            "station_id": row["properties"]["station_id"],
                            "walk_minutes": row["properties"]["walk_minutes"],
                        },
                        "geometry": row["geometry"],
                    }
                    for row in station_feature_rows
                ],
            },
        },
        "outputs": {
            "stations": {
                "type": "FeatureCollection",
                "features": station_feature_rows,
            },
            "station_buffers": {
                "type": "FeatureCollection",
                "features": buffer_feature_rows,
            },
            "station_service_tracts": {
                "type": "FeatureCollection",
                "features": service_tract_rows,
            },
        },
    }


def analyze_stations_sync(
    corridor_geojson: dict[str, Any],
    stations: list[dict[str, Any]],
    coefficients: dict[str, float] | None = None,
    recalculate: bool = False,
) -> dict[str, Any]:
    return asyncio.run(
        analyze_stations(corridor_geojson, stations, coefficients, recalculate)
    )
