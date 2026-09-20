"""
Weather Data Core Processing Module
Adapted from reference/weather_analysis.py for backend service use.
All CLI and Matplotlib plotting dependencies removed.
"""

import os
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import requests

try:
    from sklearn.linear_model import LinearRegression
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


# ----------------------------------------------------------------
# 1. DATA ACQUISITION
# ----------------------------------------------------------------
def fetch_weather_data(latitude: float, longitude: float, start_date: str, end_date: str,
                       cache_file: str = None) -> pd.DataFrame:
    """
    Fetch daily historical weather data from the Open-Meteo Archive API.

    Parameters
    ----------
    latitude, longitude : float
        Coordinates of the location.
    start_date, end_date : str
        'YYYY-MM-DD' formatted date range.
    cache_file : str, optional
        If provided and file exists, load from it instead of calling the API.

    Returns
    -------
    pandas.DataFrame with columns:
        date, temp_max_c, temp_min_c, temp_mean_c,
        precipitation_mm, windspeed_max_kmh
    """
    if cache_file and os.path.exists(cache_file):
        return pd.read_csv(cache_file, parse_dates=["date"])

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "precipitation_sum",
            "windspeed_10m_max",
        ]),
        "timezone": "auto",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()

    if "daily" not in payload or "time" not in payload["daily"]:
        raise ValueError("Unexpected API response format from Open-Meteo.")

    daily = payload["daily"]
    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        "temp_max_c": daily["temperature_2m_max"],
        "temp_min_c": daily["temperature_2m_min"],
        "temp_mean_c": daily["temperature_2m_mean"],
        "precipitation_mm": daily["precipitation_sum"],
        "windspeed_max_kmh": daily["windspeed_10m_max"],
    })

    if cache_file:
        df.to_csv(cache_file, index=False)

    return df


def load_weather_csv(path: str) -> pd.DataFrame:
    """
    Load weather data from a local CSV. Auto-detects column names
    for common variants.
    """
    df = pd.read_csv(path)
    df.columns = [c.strip().lower() for c in df.columns]
    rename_map = {}
    for c in df.columns:
        if "date" in c or "time" in c:
            rename_map[c] = "date"
        elif "max" in c and "temp" in c:
            rename_map[c] = "temp_max_c"
        elif "min" in c and "temp" in c:
            rename_map[c] = "temp_min_c"
        elif ("mean" in c and "temp" in c) or c == "temperature":
            rename_map[c] = "temp_mean_c"
    df = df.rename(columns=rename_map)
    df["date"] = pd.to_datetime(df["date"])
    return df


# ----------------------------------------------------------------
# 2. DATA CLEANING & PREPROCESSING
# ----------------------------------------------------------------
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw weather DataFrame:
      - Drop duplicate rows by date
      - Sort by date
      - Derive temp_mean_c if missing
      - Interpolate small gaps (up to 3 consecutive missing values)
      - Clip outliers outside [-90°C, 60°C] and re-interpolate
      - Drop any remaining rows without temp_mean_c
    """
    df = df.copy()

    df = df.drop_duplicates(subset="date")
    df = df.sort_values("date").reset_index(drop=True)

    if "temp_mean_c" not in df.columns or df["temp_mean_c"].isna().all():
        if {"temp_max_c", "temp_min_c"}.issubset(df.columns):
            df["temp_mean_c"] = (df["temp_max_c"] + df["temp_min_c"]) / 2

    temp_cols = [c for c in ["temp_max_c", "temp_min_c", "temp_mean_c"]
                 if c in df.columns]

    # Interpolate small gaps
    if temp_cols:
        df[temp_cols] = df[temp_cols].interpolate(limit=3, limit_direction="both")

        # Clip implausible values (surface temperature bounds -90°C to 60°C)
        for col in temp_cols:
            mask = (df[col] < -90) | (df[col] > 60)
            df.loc[mask, col] = np.nan
        df[temp_cols] = df[temp_cols].interpolate(limit=3, limit_direction="both")

    df = df.dropna(subset=["temp_mean_c"]).reset_index(drop=True)
    return df


# ----------------------------------------------------------------
# 3. UNIT CONVERSION
# ----------------------------------------------------------------
def celsius_to_fahrenheit(c):
    """Convert Celsius to Fahrenheit."""
    return (np.asarray(c, dtype=float) * 9 / 5) + 32


def fahrenheit_to_celsius(f):
    """Convert Fahrenheit to Celsius."""
    return (np.asarray(f, dtype=float) - 32) * 5 / 9


def add_fahrenheit_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add Fahrenheit columns corresponding to present Celsius temperature columns."""
    df = df.copy()
    for col in ["temp_max_c", "temp_min_c", "temp_mean_c"]:
        if col in df.columns:
            f_col = col.replace("_c", "_f")
            df[f_col] = celsius_to_fahrenheit(df[col])
    return df


# ----------------------------------------------------------------
# 4. TREND ANALYSIS
# ----------------------------------------------------------------
def analyze_trends(df: pd.DataFrame) -> dict:
    """Compute summary statistics, trend direction, and monthly averages."""
    stats = {
        "start_date": df["date"].min().date().isoformat(),
        "end_date": df["date"].max().date().isoformat(),
        "num_days": int(len(df)),
        "avg_temp_c": round(float(df["temp_mean_c"].mean()), 2),
        "max_temp_c": round(float(df["temp_max_c"].max()), 2) if "temp_max_c" in df.columns else None,
        "min_temp_c": round(float(df["temp_min_c"].min()), 2) if "temp_min_c" in df.columns else None,
        "std_temp_c": round(float(df["temp_mean_c"].std()), 2) if len(df) > 1 else 0.0,
    }

    # Linear trend: slope of mean temperature over time (deg C per day)
    x = np.arange(len(df))
    y = df["temp_mean_c"].values
    if len(df) >= 2:
        slope, _ = np.polyfit(x, y, 1)
        stats["trend_slope_c_per_day"] = round(float(slope), 5)
        stats["trend_direction"] = (
            "warming" if slope > 0.001 else
            "cooling" if slope < -0.001 else
            "stable"
        )
    else:
        stats["trend_slope_c_per_day"] = 0.0
        stats["trend_direction"] = "insufficient data"

    # Monthly averages
    try:
        monthly = (
            df.set_index("date")["temp_mean_c"]
            .resample("ME")
            .mean()
            .round(2)
        )
    except ValueError:
        monthly = (
            df.set_index("date")["temp_mean_c"]
            .resample("M")
            .mean()
            .round(2)
        )

    stats["monthly_avg_c"] = {
        str(k.date()): (float(v) if pd.notna(v) else None)
        for k, v in monthly.items()
    }

    return stats


# ----------------------------------------------------------------
# 5. FORECASTING
# ----------------------------------------------------------------
def simple_forecast(df: pd.DataFrame, days_ahead: int = 7) -> pd.DataFrame:
    """
    Basic short-term forecast using linear regression on recent 30 days.
    Returns DataFrame with date and forecast_temp_c columns.
    """
    if len(df) == 0:
        return pd.DataFrame(columns=["date", "forecast_temp_c"])

    recent = df.tail(30).reset_index(drop=True)
    x = np.arange(len(recent)).reshape(-1, 1)
    y = recent["temp_mean_c"].values

    if len(recent) >= 2:
        if HAS_SKLEARN:
            model = LinearRegression()
            model.fit(x, y)
            future_x = np.arange(len(recent), len(recent) + days_ahead).reshape(-1, 1)
            predictions = model.predict(future_x)
        else:
            slope, intercept = np.polyfit(x.flatten(), y, 1)
            future_x = np.arange(len(recent), len(recent) + days_ahead)
            predictions = slope * future_x + intercept
    else:
        # Fallback if insufficient points
        predictions = np.repeat(y[-1] if len(y) > 0 else 20.0, days_ahead)

    last_date = df["date"].max()
    future_dates = [last_date + timedelta(days=i + 1) for i in range(days_ahead)]

    forecast_df = pd.DataFrame({
        "date": future_dates,
        "forecast_temp_c": np.round(predictions, 2),
    })

    return forecast_df
