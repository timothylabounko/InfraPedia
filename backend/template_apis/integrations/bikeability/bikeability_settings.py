from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

TIMS_CSV = Path(os.getenv("TIMS_CSV", DATA_DIR / "tims_crashes.csv"))
BIKE_ROUTES_SHP = Path(
    os.getenv(
        "BIKE_ROUTES_SHP",
        r"C:\Users\User\Downloads\Shapefiles and Geodatabases\SCAG_Bike_Lanes\Bike_Routes_%E2%80%93_SCAG_Region.shp",
    )
)

CALIFORNIA_BOUNDS = {
    "south": 32.534,
    "north": 42.009,
    "west": -124.409,
    "east": -114.131,
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
PROJECTED_CRS = "EPSG:3310"

# Earliest year typically available from California TIMS/SWITRS exports.
TIMS_FIRST_YEAR = 2008
