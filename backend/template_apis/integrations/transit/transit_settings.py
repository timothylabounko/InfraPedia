import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent.parent.parent / ".env")

IPUMS_API_KEY = os.getenv("IPUMS_API_KEY", "")
CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# Continental US + Alaska + Hawaii (rough envelope for corridor validation)
US_BOUNDS = {
    "south": 18.0,
    "north": 72.0,
    "west": -180.0,
    "east": -65.0,
}

CORRIDOR_BUFFER_METERS = 800
# Average walking speed ~3 mph ≈ 80 meters per minute
WALK_SPEED_M_PER_MIN = 80.0
DEFAULT_WALK_MINUTES = 10.0
AVG_HOUSEHOLD_SIZE = 2.53

DEFAULT_COEFFICIENTS = {
    "transit_commute": 1.0,
    "no_vehicle": 0.8,
    "population_density": 0.5,
    "median_income": -0.3,
    "renter_occupied": 0.4,
    "walk_commute": 0.6,
}

COEFFICIENT_LABELS = {
    "transit_commute": "Share commuting by transit",
    "no_vehicle": "Households with no vehicle",
    "population_density": "Population density",
    "median_income": "Median household income",
    "renter_occupied": "Renter-occupied housing",
    "walk_commute": "Share commuting by walking",
}
