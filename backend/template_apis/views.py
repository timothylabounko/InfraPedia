"""HTTP views for map template APIs (single InfraPedia backend)."""

from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
from pathlib import Path

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .osm_service import geocode_place, proxy_overpass

INTEGRATIONS = Path(__file__).resolve().parent / 'integrations'


def _load_package(name: str, root: Path):
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    return importlib.import_module(name)


def _transit_modules():
    root = INTEGRATIONS / 'transit'
    return (
        _load_package('transit_propensity', root),
        _load_package('station_analysis', root),
        _load_package('tract_demographics', root),
        _load_package('ipums_client', root),
    )


def _bikeability_module():
    root = INTEGRATIONS / 'bikeability'
    return _load_package('bike_safety', root)


@require_GET
def health(_request: HttpRequest) -> JsonResponse:
    checks: dict[str, str] = {'status': 'ok', 'osm': 'osmnx'}
    try:
        ipums_client = _load_package('ipums_client', INTEGRATIONS / 'transit')
        ok, message = asyncio.run(ipums_client.verify_ipums_api_key())
        checks['ipums'] = message
        if not ok:
            checks['status'] = 'degraded'
    except Exception as exc:
        checks['ipums'] = str(exc)
        checks['status'] = 'degraded'
    return JsonResponse(checks)


@csrf_exempt
@require_http_methods(['GET'])
def osm_geocode(request: HttpRequest) -> JsonResponse:
    query = request.GET.get('q', '').strip()
    country = request.GET.get('country')
    return JsonResponse(geocode_place(query, country=country))


@csrf_exempt
@require_http_methods(['GET'])
def nominatim_compat(request: HttpRequest) -> JsonResponse:
    query = request.GET.get('q', '').strip()
    result = geocode_place(query)
    if result.get('status') != 'success':
        return JsonResponse([], safe=False)
    return JsonResponse(
        [
            {
                'lat': str(result['lat']),
                'lon': str(result['lng']),
                'display_name': result.get('display_name', query),
            }
        ],
        safe=False,
    )


@csrf_exempt
@require_http_methods(['POST'])
def overpass_proxy(request: HttpRequest) -> HttpResponse:
    status, body = proxy_overpass(
        request.body.decode('utf-8', errors='replace'),
        request.headers.get('Content-Type', 'application/x-www-form-urlencoded'),
    )
    return HttpResponse(body, status=status, content_type='application/json')


@csrf_exempt
@require_http_methods(['GET'])
def tract_demographics(request: HttpRequest, geoid: str) -> JsonResponse:
    geoid = geoid.strip()
    if len(geoid) != 11 or not geoid.isdigit():
        return JsonResponse(
            {'status': 'error', 'message': 'GEOID must be an 11-digit census tract code.'}
        )
    try:
        tract_demographics_mod = _load_package('tract_demographics', INTEGRATIONS / 'transit')
        by_geoid = asyncio.run(tract_demographics_mod.fetch_demographics_by_geoid([geoid]))
    except Exception:
        return JsonResponse(
            {'status': 'error', 'message': 'Could not load demographics for this tract.'}
        )
    demographics = by_geoid.get(geoid)
    if not demographics:
        return JsonResponse({'status': 'error', 'message': 'No demographics found for this tract.'})
    return JsonResponse({'status': 'success', 'geoid': geoid, 'demographics': demographics})


@csrf_exempt
@require_http_methods(['POST'])
def analyze_corridor(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON body.'}, status=400)

    try:
        transit_propensity, *_ = _transit_modules()
        result = transit_propensity.analyze_corridor_sync(
            payload.get('corridor'),
            coefficients=payload.get('coefficients'),
            recalculate=bool(payload.get('recalculate')),
        )
        return JsonResponse(result)
    except Exception as exc:
        return JsonResponse(
            {'status': 'error', 'message': f'Transit analysis failed: {exc}'},
            status=500,
        )


@csrf_exempt
@require_http_methods(['POST'])
def analyze_station(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON body.'}, status=400)

    try:
        _, station_analysis, *_ = _transit_modules()
        stations = payload.get('stations') or []
        result = station_analysis.analyze_stations_sync(
            payload.get('corridor'),
            stations,
            coefficients=payload.get('coefficients'),
            recalculate=bool(payload.get('recalculate')),
        )
        return JsonResponse(result)
    except Exception as exc:
        return JsonResponse(
            {'status': 'error', 'message': f'Station analysis failed: {exc}'},
            status=500,
        )


@csrf_exempt
@require_http_methods(['POST'])
def bikeability_city(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON body.'}, status=400)

    try:
        bike_safety = _bikeability_module()
        result = bike_safety.analyze_city(
            payload.get('city', ''),
            weights=payload.get('weights'),
            accident_year=payload.get('accident_year'),
            recalculate=bool(payload.get('recalculate')),
        )
        return JsonResponse(result)
    except Exception as exc:
        return JsonResponse(
            {'status': 'error', 'message': f'Bikeability analysis failed: {exc}'},
            status=500,
        )
