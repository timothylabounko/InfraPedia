"""Fetch ACS race and Census sex demographics for census tracts by GEOID."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

ACS_RACE_TRACT_URL = (
    "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/"
    "ACS_Population_by_Race_and_Hispanic_Origin_Boundaries/FeatureServer/2/query"
)

CENSUS_SEX_TRACT_URL = (
    "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/"
    "USA_Census_2020_DHC_Age_and_Sex/FeatureServer/3/query"
)

RACE_OUT_FIELDS = (
    "GEOID,NAME,B03002_001E,"
    "B03002_calc_pctNHWhiteE,B03002_calc_pctBlackE,B03002_calc_pctAIANE,"
    "B03002_calc_pctAsianE,B03002_calc_pctNHOPIE,B03002_calc_pctOtherE,"
    "B03002_calc_pct2OrMoreE,B03002_calc_pctHispLatE"
)

SEX_OUT_FIELDS = "GEOID,P0010001,P0120002,P0120026"

GEOID_BATCH_SIZE = 80

RACE_LABELS = [
    ("pct_white_nh", "B03002_calc_pctNHWhiteE", "White (non-Hispanic)"),
    ("pct_black_nh", "B03002_calc_pctBlackE", "Black (non-Hispanic)"),
    ("pct_aian_nh", "B03002_calc_pctAIANE", "American Indian / Alaska Native"),
    ("pct_asian_nh", "B03002_calc_pctAsianE", "Asian (non-Hispanic)"),
    ("pct_nhopi_nh", "B03002_calc_pctNHOPIE", "Native Hawaiian / Pacific Islander"),
    ("pct_other_nh", "B03002_calc_pctOtherE", "Other race (non-Hispanic)"),
    ("pct_two_or_more_nh", "B03002_calc_pct2OrMoreE", "Two or more races"),
    ("pct_hispanic", "B03002_calc_pctHispLatE", "Hispanic or Latino"),
]


def _chunks(items: list[str], size: int) -> list[list[str]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def _num(value: Any) -> float | int | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pct(value: Any) -> float | None:
    parsed = _num(value)
    if parsed is None:
        return None
    return round(parsed, 1)


def _build_demographics_block(
    race: dict[str, Any] | None,
    sex: dict[str, Any] | None,
) -> dict[str, Any]:
    block: dict[str, Any] = {
        "tract_name": (race or {}).get("NAME"),
        "acs_total_population": _num((race or {}).get("B03002_001E")),
        "race_source": "ACS 2019–2023 (5-year estimates)",
        "sex_source": "2020 Census (DHC) — sex by age",
    }

    race_rows = []
    for key, field, label in RACE_LABELS:
        pct = _pct((race or {}).get(field))
        if pct is not None:
            race_rows.append({"key": key, "label": label, "percent": pct})
    block["race"] = race_rows

    total = _num((sex or {}).get("P0010001"))
    male = _num((sex or {}).get("P0120002"))
    female = _num((sex or {}).get("P0120026"))
    sex_rows = []
    if male is not None:
        sex_rows.append(
            {
                "label": "Male",
                "count": int(male),
                "percent": round(male / total * 100, 1) if total else None,
            }
        )
    if female is not None:
        sex_rows.append(
            {
                "label": "Female",
                "count": int(female),
                "percent": round(female / total * 100, 1) if total else None,
            }
        )
    block["sex"] = sex_rows
    block["census_total_population"] = int(total) if total is not None else None

    return block


async def _query_attributes(
    url: str,
    geoids: list[str],
    out_fields: str,
) -> dict[str, dict[str, Any]]:
    if not geoids:
        return {}

    results: dict[str, dict[str, Any]] = {}
    async with httpx.AsyncClient(timeout=60.0) as client:
        for batch in _chunks(geoids, GEOID_BATCH_SIZE):
            quoted = ",".join(f"'{geoid}'" for geoid in batch)
            params = {
                "where": f"GEOID IN ({quoted})",
                "outFields": out_fields,
                "returnGeometry": "false",
                "f": "json",
            }
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
            for feature in payload.get("features", []):
                attributes = feature.get("attributes", {})
                geoid = attributes.get("GEOID")
                if geoid:
                    results[geoid] = attributes
    return results


async def fetch_demographics_by_geoid(geoids: list[str]) -> dict[str, dict[str, Any]]:
    unique = sorted({geoid for geoid in geoids if geoid})
    if not unique:
        return {}

    race_task = _query_attributes(ACS_RACE_TRACT_URL, unique, RACE_OUT_FIELDS)
    sex_task = _query_attributes(CENSUS_SEX_TRACT_URL, unique, SEX_OUT_FIELDS)
    race_by_geoid, sex_by_geoid = await asyncio.gather(race_task, sex_task)

    return {
        geoid: _build_demographics_block(race_by_geoid.get(geoid), sex_by_geoid.get(geoid))
        for geoid in unique
    }


def attach_demographics_to_features(
    features: list[dict[str, Any]],
    demographics_by_geoid: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    enriched = []
    for feature in features:
        geoid = feature.get("properties", {}).get("GEOID")
        demo = demographics_by_geoid.get(geoid) if geoid else None
        props = {**feature.get("properties", {})}
        if demo:
            props["demographics"] = demo
        enriched.append({**feature, "properties": props})
    return enriched


async def enrich_tract_features(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    geoids = [
        feature["properties"]["GEOID"]
        for feature in features
        if feature.get("properties", {}).get("GEOID")
    ]
    try:
        demographics_by_geoid = await fetch_demographics_by_geoid(geoids)
    except httpx.HTTPError:
        return features
    return attach_demographics_to_features(features, demographics_by_geoid)
