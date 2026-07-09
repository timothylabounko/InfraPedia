"""IPUMS API integration (metadata + key validation)."""

from __future__ import annotations

import httpx

from transit_settings import IPUMS_API_KEY

IPUMS_EXTRACTS_URL = (
    "https://api.ipums.org/extracts?collection=nhgis&version=2"
)


def api_key_configured() -> bool:
    return bool(IPUMS_API_KEY.strip())


async def verify_ipums_api_key() -> tuple[bool, str]:
    if not api_key_configured():
        return False, "IPUMS_API_KEY is not set in backend/.env"

    headers = {"Authorization": IPUMS_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(IPUMS_EXTRACTS_URL, headers=headers)
        if response.status_code == 200:
            return True, "IPUMS API key verified (NHGIS extracts access)."
        if response.status_code in (401, 403):
            return False, "IPUMS API key was rejected."
        return False, f"IPUMS API returned status {response.status_code}."
    except httpx.HTTPError as exc:
        return False, f"Could not reach IPUMS API: {exc}"


def data_source_label() -> str:
    return (
        "BTS NTAD ACS 2024 tract commute data "
        "(IPUMS NHGIS-compatible variables; IPUMS API key verified)"
    )
