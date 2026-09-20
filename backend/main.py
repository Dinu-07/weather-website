from datetime import date
from typing import Dict, Tuple

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from weather_core import (
    add_fahrenheit_columns,
    analyze_trends,
    clean_data,
    fetch_weather_data,
    simple_forecast,
)

app = FastAPI(title="Weather Analysis API", version="1.0.0")

# CORS middleware allowing all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache keyed by (lat, lon, start, end) -> pd.DataFrame
weather_cache: Dict[Tuple[float, float, str, str], pd.DataFrame] = {}


def get_cached_or_fetch_weather(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    """
    Retrieve processed weather data from in-memory cache if present;
    otherwise fetch from Open-Meteo, clean, and enrich with Fahrenheit columns.
    """
    cache_key = (round(float(lat), 4), round(float(lon), 4), str(start), str(end))
    if cache_key in weather_cache:
        return weather_cache[cache_key]

    raw_df = fetch_weather_data(latitude=lat, longitude=lon, start_date=start, end_date=end)
    cleaned_df = clean_data(raw_df)
    full_df = add_fahrenheit_columns(cleaned_df)

    weather_cache[cache_key] = full_df
    return full_df


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/weather")
def get_weather(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Fetch, clean, enrich historical weather data and compute trend statistics.
    """
    try:
        full_df = get_cached_or_fetch_weather(lat, lon, start, end)
        stats = analyze_trends(full_df)

        df_export = full_df.copy()
        df_export["date"] = df_export["date"].dt.strftime("%Y-%m-%d")
        daily_records = df_export.replace({np.nan: None}).to_dict(orient="records")

        return {
            "daily": daily_records,
            "stats": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/forecast")
def get_forecast(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
    days: int = Query(7, ge=1, le=30, description="Number of days to forecast ahead"),
):
    """
    Project future daily temperatures using linear regression on recent historical trends.
    """
    try:
        full_df = get_cached_or_fetch_weather(lat, lon, start, end)
        forecast_df = simple_forecast(full_df, days_ahead=days)

        f_export = forecast_df.copy()
        f_export["date"] = pd.to_datetime(f_export["date"]).dt.strftime("%Y-%m-%d")
        forecast_records = f_export.replace({np.nan: None}).to_dict(orient="records")

        return {
            "forecast": forecast_records,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/geocode")
def geocode_location(
    query: str = Query(..., min_length=1, description="Location search query"),
):
    """
    Search places using Open-Meteo's Geocoding API.
    Returns a simplified list of matches (name, country, admin1/region, latitude, longitude).
    """
    try:
        url = "https://geocoding-api.open-meteo.com/v1/search"
        params = {
            "name": query.strip(),
            "count": 5,
            "language": "en",
            "format": "json",
        }
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        results = data.get("results", []) or []
        matches = []
        for item in results:
            name = item.get("name", "")
            admin1 = item.get("admin1", "")
            country = item.get("country", "")
            parts = [p for p in [name, admin1, country] if p]
            display_name = ", ".join(parts)

            matches.append({
                "name": name,
                "country": country,
                "admin1": admin1,
                "region": admin1,
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "display_name": display_name,
            })

        return matches
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
