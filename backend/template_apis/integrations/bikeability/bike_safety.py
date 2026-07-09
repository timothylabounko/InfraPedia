from __future__ import annotations

import json
from functools import lru_cache

import geopandas as gpd
import numpy as np
import osmnx as ox
import pandas as pd
import requests
from shapely.geometry import Point

from bikeability_settings import (
    BIKE_ROUTES_SHP,
    CALIFORNIA_BOUNDS,
    NOMINATIM_URL,
    PROJECTED_CRS,
    TIMS_CSV,
    TIMS_FIRST_YEAR,
)

CITY_ADDRESS_TYPES = {
    "city",
    "town",
    "village",
    "hamlet",
    "suburb",
    "municipality",
}
TOO_LARGE_ADDRESS_TYPES = {"state", "country", "county", "region", "continent"}

ACCIDENT_COLUMNS = [
    "COUNT_COMPLAINT_PAIN",
    "COUNT_VISIBLE_INJ",
    "COUNT_MC_KILLED",
    "COUNT_SEVERE_INJ",
    "COUNT_PED_INJURED",
    "COUNT_BICYCLIST_INJURED",
]

DEFAULT_WEIGHTS = {
    "speed": 1.0,
    "length": 1.0,
    "road_type": 1.0,
    "lanes": 1.0,
    "accidents": 1.0,
    "bike_lanes": 1.0,
}

WEIGHT_LABELS = {
    "speed": "Speed",
    "length": "Street length",
    "road_type": "Road type",
    "lanes": "Number of lanes",
    "accidents": "TIMS accidents",
    "bike_lanes": "Bike lane infrastructure",
}

_city_sessions: dict[str, dict] = {}


def geocode_city(city_name: str) -> dict | None:
    """Geocode via OSMnx (uses OpenStreetMap; no separate API key)."""
    try:
        import osmnx as ox

        lat, lon = ox.geocode(f"{city_name}, California, USA")
    except Exception:
        return None

    return {
        "lat": str(lat),
        "lon": str(lon),
        "display_name": city_name,
        "addresstype": "city",
        "class": "place",
        "type": "city",
        "boundingbox": [
            str(lat - 0.05),
            str(lat + 0.05),
            str(lon - 0.05),
            str(lon + 0.05),
        ],
        "address": {"state": "California"},
    }


def is_in_california(result: dict) -> bool:
    lat = float(result["lat"])
    lon = float(result["lon"])
    address = result.get("address", {})
    if address.get("state") in {"California", "CA"}:
        return True
    return (
        CALIFORNIA_BOUNDS["south"] <= lat <= CALIFORNIA_BOUNDS["north"]
        and CALIFORNIA_BOUNDS["west"] <= lon <= CALIFORNIA_BOUNDS["east"]
    )


def is_city_level(result: dict) -> bool:
    if result.get("addresstype") in CITY_ADDRESS_TYPES:
        return True
    return result.get("class") == "place" and result.get("type") in CITY_ADDRESS_TYPES


def is_too_large(result: dict) -> bool:
    if result.get("addresstype") in TOO_LARGE_ADDRESS_TYPES:
        return True
    if result.get("type") in TOO_LARGE_ADDRESS_TYPES:
        return True
    return False


def validate_city(city_name: str) -> dict:
    result = geocode_city(city_name)
    if not result:
        return {"status": "not_found", "message": "That city does not exist."}
    if not is_in_california(result):
        return {"status": "not_possible", "message": "That is not possible to do yet."}
    if is_too_large(result):
        return {"status": "not_possible", "message": "That is not possible to do yet."}
    if not is_city_level(result):
        return {"status": "not_possible", "message": "That is not possible to do yet."}
    return {"status": "ok", "result": result}


def normalize_weights(weights: dict | None) -> dict[str, float]:
    merged = {**DEFAULT_WEIGHTS, **(weights or {})}
    cleaned = {}
    for key in DEFAULT_WEIGHTS:
        value = float(merged.get(key, DEFAULT_WEIGHTS[key]))
        cleaned[key] = max(value, 0.0)
    total = sum(cleaned.values())
    if total <= 0:
        return DEFAULT_WEIGHTS.copy()
    return cleaned


def _highway_equals(value, target: str) -> bool:
    if isinstance(value, list):
        return target in value
    return value == target


def make_type_numeric(road) -> int:
    if isinstance(road, list):
        road = road[0] if road else ""
    road = str(road) if not pd.isna(road) else ""
    if road in {"trunk", "trunk_link"}:
        return 6
    if road in {"primary", "primary_link"}:
        return 5
    if road in {"secondary", "secondary_link"}:
        return 4
    if road in {"tertiary", "tertiary_link"}:
        return 3
    if road == "residential":
        return 2
    if road == "unclassified":
        return 1
    return 1


def make_lanes_numeric(lanes) -> float:
    if isinstance(lanes, list):
        lanes = lanes[0] if lanes else np.nan
    if pd.isna(lanes):
        return 0.0
    lanes_str = str(lanes).split(";")[0].strip()
    if lanes_str in {"1", "2", "3", "4", "5"}:
        return float(lanes_str)
    return 0.0


def existing_bike_lanes(class_e) -> int:
    if pd.isna(class_e):
        return 6
    value = float(class_e)
    mapping = {1.0: 1, 4.0: 2, 2.0: 3, 3.0: 4, 5.0: 5}
    return mapping.get(value, 6)


def compute_accident_score(row: pd.Series) -> float:
    score = 0.0
    if row.get("COUNT_COMPLAINT_PAIN", 0) > 0:
        score += 1.0
    if row.get("COUNT_VISIBLE_INJ", 0) > 0:
        score += 2.0
    if row.get("COUNT_MC_KILLED", 0) > 0:
        score += 26.0
    if row.get("COUNT_SEVERE_INJ", 0) > 0:
        score += 26.0
    if row.get("COUNT_PED_INJURED", 0) > 0:
        score += 13.0
    if row.get("COUNT_BICYCLIST_INJURED", 0) > 0:
        score += 13.0
    return score


def score_to_color(score: float, min_score: float, max_score: float) -> str:
    if max_score <= min_score:
        normalized = 0.0
    else:
        normalized = (score - min_score) / (max_score - min_score)
    normalized = max(0.0, min(1.0, normalized))

    if normalized <= 0.5:
        red = int(255 * (normalized / 0.5))
        green = 200
        blue = int(102 * (1 - normalized / 0.5))
    else:
        red = 255
        green = int(200 * (1 - (normalized - 0.5) / 0.5))
        blue = 0

    return f"#{red:02x}{green:02x}{blue:02x}"


@lru_cache(maxsize=1)
def load_tims_points() -> gpd.GeoDataFrame:
    if not TIMS_CSV.exists():
        return gpd.GeoDataFrame(
            columns=["POINT_X", "POINT_Y", *ACCIDENT_COLUMNS, "ACCIDENT_YEAR"],
            geometry=[],
            crs="EPSG:4326",
        )
    df = pd.read_csv(TIMS_CSV)
    df = df.dropna(subset=["POINT_X", "POINT_Y"])
    for column in ACCIDENT_COLUMNS:
        if column not in df.columns:
            df[column] = 0
        df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)
    if "ACCIDENT_YEAR" in df.columns:
        df["ACCIDENT_YEAR"] = pd.to_numeric(df["ACCIDENT_YEAR"], errors="coerce")
    return gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df.POINT_X, df.POINT_Y),
        crs="EPSG:4326",
    )


@lru_cache(maxsize=1)
def load_bike_routes() -> gpd.GeoDataFrame:
    if not BIKE_ROUTES_SHP.exists():
        return gpd.GeoDataFrame(columns=["CITY", "CLASS_E", "geometry", "point"], crs="EPSG:4326")
    gdf = gpd.read_file(BIKE_ROUTES_SHP)
    gdf = gdf[gdf.geometry.notnull()].copy()
    gdf["geometry"] = gdf["geometry"].apply(
        lambda geom: geom.geoms[0]
        if geom is not None and geom.geom_type == "MultiLineString"
        else geom
    )
    gdf["point"] = gdf.geometry.apply(
        lambda geom: Point(geom.coords[0]) if geom is not None else None
    )
    return gdf


def get_all_tims_accident_years() -> list[int]:
    current_year = pd.Timestamp.now().year
    end_year = current_year

    tims = load_tims_points()
    if not tims.empty and "ACCIDENT_YEAR" in tims.columns:
        data_years = tims["ACCIDENT_YEAR"].dropna().astype(int).unique().tolist()
        if data_years:
            end_year = max(end_year, max(data_years))

    return list(range(TIMS_FIRST_YEAR, end_year + 1))


def filter_points_to_city(points: gpd.GeoDataFrame, south, north, west, east) -> gpd.GeoDataFrame:
    return points.cx[west:east, south:north]


def filter_tims_by_year(points: gpd.GeoDataFrame, accident_year: int | None) -> gpd.GeoDataFrame:
    if accident_year is None or points.empty or "ACCIDENT_YEAR" not in points.columns:
        return points
    return points[points["ACCIDENT_YEAR"] == accident_year].copy()


def filter_bike_routes_for_city(city_name: str) -> gpd.GeoDataFrame:
    routes = load_bike_routes()
    if routes.empty or "CITY" not in routes.columns:
        return gpd.GeoDataFrame(columns=["CITY", "CLASS_E", "geometry", "point"], crs="EPSG:4326")
    normalized = city_name.strip().lower()
    return routes[routes["CITY"].str.lower() == normalized].copy()


def attach_accident_and_bike_data(
    edges: gpd.GeoDataFrame,
    tims_points: gpd.GeoDataFrame,
    bikeway_points: gpd.GeoDataFrame,
) -> gpd.GeoDataFrame:
    edges = edges.copy()
    edges["edge_id"] = range(len(edges))

    for column in ACCIDENT_COLUMNS + ["CLASS_E"]:
        edges[column] = np.nan

    projected_edges = edges.to_crs(PROJECTED_CRS)
    buffered = projected_edges.copy()
    buffered["geometry"] = buffered.geometry.buffer(10)

    if not tims_points.empty:
        projected_tims = tims_points.to_crs(PROJECTED_CRS)
        tims_join = gpd.sjoin(
            buffered,
            projected_tims,
            how="left",
            predicate="intersects",
        )
        if not tims_join.empty:
            tims_join["Accident_Int"] = tims_join.apply(compute_accident_score, axis=1)
            accident_agg = (
                tims_join.groupby("edge_id")["Accident_Int"]
                .max()
                .reindex(edges["edge_id"], fill_value=0.0)
            )
            edges["Accident_Int"] = accident_agg.values
        else:
            edges["Accident_Int"] = 0.0
    else:
        edges["Accident_Int"] = 0.0

    if not bikeway_points.empty:
        bike_data = bikeway_points.rename(columns={"CLASS_E": "BIKE_CLASS_E"})[
            ["BIKE_CLASS_E"]
        ].copy()
        bike_data = gpd.GeoDataFrame(
            bike_data,
            geometry=bikeway_points.geometry,
            crs=bikeway_points.crs,
        ).to_crs(PROJECTED_CRS)
        bike_join = gpd.sjoin(
            buffered,
            bike_data,
            how="left",
            predicate="intersects",
        )
        if not bike_join.empty:
            class_agg = (
                bike_join.groupby("edge_id")["BIKE_CLASS_E"]
                .min()
                .reindex(edges["edge_id"])
            )
            edges["CLASS_E"] = class_agg.values
    else:
        edges["CLASS_E"] = np.nan

    return edges


def compute_bike_safety_scores(
    edges: gpd.GeoDataFrame,
    weights: dict | None = None,
) -> gpd.GeoDataFrame:
    edges = edges.copy()
    weight_values = normalize_weights(weights)
    weight_total = sum(weight_values.values())

    edges["speed_kph"] = pd.to_numeric(edges["speed_kph"], errors="coerce").fillna(0)
    edges["length"] = pd.to_numeric(edges["length"], errors="coerce").fillna(0)

    score = (
        weight_values["speed"]
        * edges["speed_kph"]
        / max(edges["speed_kph"].abs().max(), 1)
    )
    score += (
        weight_values["length"]
        * edges["length"]
        / max(edges["length"].abs().max(), 1)
    )

    edges["Road Type Intensity Score"] = edges["highway"].apply(make_type_numeric)
    score += (
        weight_values["road_type"]
        * edges["Road Type Intensity Score"]
        / max(edges["Road Type Intensity Score"].abs().max(), 1)
    )

    edges["Lanes Int"] = edges["lanes"].apply(make_lanes_numeric)
    score += weight_values["lanes"] * edges["Lanes Int"] / max(edges["Lanes Int"].abs().max(), 1)

    accident_max = max(edges["Accident_Int"].abs().max(), 1)
    score += weight_values["accidents"] * edges["Accident_Int"] / accident_max

    edges["Bike Lane Score"] = edges["CLASS_E"].apply(existing_bike_lanes)
    score += (
        weight_values["bike_lanes"]
        * edges["Bike Lane Score"]
        / max(edges["Bike Lane Score"].abs().max(), 1)
    )

    edges["bike_safety_score"] = score / weight_total
    edges.loc[
        edges["highway"].apply(lambda value: _highway_equals(value, "motorway")),
        "bike_safety_score",
    ] = 1
    edges.loc[
        edges["highway"].apply(lambda value: _highway_equals(value, "motorway_link")),
        "bike_safety_score",
    ] = 1

    min_score = edges["bike_safety_score"].min()
    max_score = edges["bike_safety_score"].max()
    edges["color"] = edges["bike_safety_score"].apply(
        lambda value: score_to_color(value, min_score, max_score)
    )
    return edges


def graph_to_geojson(edges: gpd.GeoDataFrame) -> dict:
    export_edges = edges[["highway", "bike_safety_score", "color", "geometry"]].copy()
    export_edges["bike_safety_score"] = export_edges["bike_safety_score"].astype(float)
    return json.loads(export_edges.to_json())


def _build_or_get_session(display_name: str, result: dict) -> dict:
    city_key = display_name.lower()
    if city_key in _city_sessions:
        return _city_sessions[city_key]

    graph = ox.graph_from_place(f"{display_name}, California, USA", network_type="drive")
    graph = ox.add_edge_speeds(graph)
    base_edges = ox.graph_to_gdfs(graph, nodes=False, edges=True).reset_index(drop=True)

    if "lanes" not in base_edges.columns:
        base_edges["lanes"] = np.nan

    south, north, west, east = map(float, result["boundingbox"])
    session = {
        "display_name": display_name,
        "result": result,
        "bbox": (south, north, west, east),
        "base_edges": base_edges,
    }
    _city_sessions[city_key] = session
    return session


def _success_response(
    display_name: str,
    result: dict,
    geojson: dict,
    weights: dict,
    accident_year: int | None,
    available_years: list[int],
    *,
    recalculated: bool = False,
) -> dict:
    year_label = str(accident_year) if accident_year else "all years"
    if recalculated:
        message = f"Scores recalculated for {display_name} using {year_label} TIMS data."
    else:
        message = f"Bike safety map loaded for {display_name}."

    return {
        "status": "success",
        "message": message,
        "geojson": geojson,
        "center": [float(result["lat"]), float(result["lon"])],
        "displayName": display_name,
        "weights": weights,
        "weightLabels": WEIGHT_LABELS,
        "availableAccidentYears": available_years,
        "accidentYear": accident_year,
    }


def analyze_city(
    city_name: str,
    weights: dict | None = None,
    accident_year: int | None = None,
    *,
    recalculate: bool = False,
) -> dict:
    validation = validate_city(city_name)
    if validation["status"] != "ok":
        return validation

    result = validation["result"]
    display_name = result["display_name"].split(",")[0]
    normalized_weights = normalize_weights(weights)
    south, north, west, east = map(float, result["boundingbox"])

    try:
        session = _build_or_get_session(display_name, result)
        base_edges = session["base_edges"].copy()

        tims_points = filter_points_to_city(load_tims_points(), south, north, west, east)
        tims_points = filter_tims_by_year(tims_points, accident_year)
        available_years = get_all_tims_accident_years()

        bikeway_routes = filter_bike_routes_for_city(display_name)
        if bikeway_routes.empty:
            bikeway_points = gpd.GeoDataFrame(
                {"CLASS_E": []},
                geometry=[],
                crs="EPSG:4326",
            )
        else:
            bikeway_points = gpd.GeoDataFrame(
                {"CLASS_E": bikeway_routes["CLASS_E"]},
                geometry=bikeway_routes["point"],
                crs="EPSG:4326",
            )

        edges = attach_accident_and_bike_data(base_edges, tims_points, bikeway_points)
        edges = compute_bike_safety_scores(edges, normalized_weights)
        geojson = graph_to_geojson(edges.to_crs("EPSG:4326"))

        if not geojson["features"]:
            return {
                "status": "error",
                "message": "No street network found for this city.",
            }

        return _success_response(
            display_name,
            result,
            geojson,
            normalized_weights,
            accident_year,
            available_years,
            recalculated=recalculate,
        )
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Could not load street network: {exc}",
        }
