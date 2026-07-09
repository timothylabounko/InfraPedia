"""OpenStreetMap helpers via OSMnx (server-side, no user API key required)."""

from __future__ import annotations

import json
from typing import Any

import osmnx as ox
import requests

OVERPASS_ENDPOINTS = (
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
)

OSM_USER_AGENT = 'InfraPedia/1.0 (platform osmnx)'


def geocode_place(query: str, *, country: str | None = None) -> dict[str, Any]:
    """Geocode a place name to coordinates using OSMnx."""
    search = query.strip()
    if not search:
        return {'status': 'error', 'message': 'Query is required.'}

    if country:
        search = f'{search}, {country}'

    try:
        result = ox.geocode(search)
    except Exception as exc:
        return {'status': 'error', 'message': str(exc) or 'Could not geocode that place.'}

    if not result:
        return {'status': 'error', 'message': 'No results found.'}

    lat, lng = result
    return {
        'status': 'success',
        'lat': lat,
        'lng': lng,
        'display_name': search,
    }


def proxy_overpass(body: str, content_type: str) -> tuple[int, str]:
    """Try public Overpass endpoints (used when OSMnx graph download is not enough)."""
    headers = {
        'Content-Type': content_type or 'application/x-www-form-urlencoded',
        'User-Agent': OSM_USER_AGENT,
    }
    last_error = 'Overpass request failed.'
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            response = requests.post(endpoint, data=body, headers=headers, timeout=60)
            if response.ok and 'runtime error' not in response.text.lower():
                return response.status_code, response.text
            last_error = response.text[:500] or last_error
        except requests.RequestException as exc:
            last_error = str(exc)
    return 502, json.dumps({'status': 'error', 'message': last_error})
