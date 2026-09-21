"""
Weather Data Core Processing Module
Adapted from reference/weather_analysis.py for backend service use.
All CLI and Matplotlib plotting dependencies removed.
"""

import os
from concurrent.futures import ThreadPoolExecutor
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
    Fetch daily historical weather data from the Open-Meteo Archive API,
    including sunrise, sunset, uv_index_max, weathercode, and hourly relative_humidity_2m
    aggregated into daily mean humidity.

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
        precipitation_mm, windspeed_max_kmh,
        wind_speed_max, wind_gusts_max, wind_direction_dominant,
        precipitation_hours, precipitation_probability, solar_radiation_sum,
        sunrise, sunset, uv_index_max, weathercode,
        humidity_pct, feels_like_c, dewpoint_c, cloudcover_pct
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
            "windgusts_10m_max",
            "winddirection_10m_dominant",
            "precipitation_hours",
            "precipitation_probability_mean",
            "shortwave_radiation_sum",
            "sunrise",
            "sunset",
            "uv_index_max",
            "weathercode",
        ]),
        "hourly": ",".join([
            "relative_humidity_2m",
            "apparent_temperature",
            "dewpoint_2m",
            "cloudcover",
        ]),
        "timezone": "auto",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()

    if "daily" not in payload or "time" not in payload["daily"]:
        raise ValueError("Unexpected API response format from Open-Meteo.")

    daily = payload["daily"]
    weathercode_data = daily.get("weathercode") if "weathercode" in daily else daily.get("weather_code")

    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        "temp_max_c": daily.get("temperature_2m_max"),
        "temp_min_c": daily.get("temperature_2m_min"),
        "temp_mean_c": daily.get("temperature_2m_mean"),
        "precipitation_mm": daily.get("precipitation_sum"),
        "windspeed_max_kmh": daily.get("windspeed_10m_max"),
        "wind_speed_max": daily.get("windspeed_10m_max"),
        "wind_gusts_max": daily.get("windgusts_10m_max"),
        "wind_direction_dominant": daily.get("winddirection_10m_dominant"),
        "precipitation_hours": daily.get("precipitation_hours"),
        "precipitation_probability": daily.get("precipitation_probability_mean"),
        "solar_radiation_sum": daily.get("shortwave_radiation_sum"),
        "sunrise": daily.get("sunrise"),
        "sunset": daily.get("sunset"),
        "uv_index_max": daily.get("uv_index_max"),
        "weathercode": weathercode_data,
    })

    # Hourly telemetry aggregation into daily means
    if "hourly" in payload and "time" in payload["hourly"]:
        h_data = {"datetime": pd.to_datetime(payload["hourly"]["time"])}
        if "relative_humidity_2m" in payload["hourly"]:
            h_data["humidity_pct"] = payload["hourly"]["relative_humidity_2m"]
        if "apparent_temperature" in payload["hourly"]:
            h_data["feels_like_c"] = payload["hourly"]["apparent_temperature"]
        if "dewpoint_2m" in payload["hourly"]:
            h_data["dewpoint_c"] = payload["hourly"]["dewpoint_2m"]
        if "cloudcover" in payload["hourly"]:
            h_data["cloudcover_pct"] = payload["hourly"]["cloudcover"]

        hourly_df = pd.DataFrame(h_data)
        hourly_df["date"] = pd.to_datetime(hourly_df["datetime"].dt.date)
        agg_cols = [c for c in ["humidity_pct", "feels_like_c", "dewpoint_c", "cloudcover_pct"] if c in hourly_df.columns]
        if agg_cols:
            daily_agg = hourly_df.groupby("date")[agg_cols].mean().round(1).reset_index()
            df = pd.merge(df, daily_agg, on="date", how="left")

    for col in ["humidity_pct", "feels_like_c", "dewpoint_c", "cloudcover_pct"]:
        if col not in df.columns:
            df[col] = None

    # Overlay live UV Index & precipitation probability from Forecast API for overlapping recent dates (~90 days past to +16 days ahead)
    try:
        min_fore_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
        max_fore_date = (datetime.today() + timedelta(days=16)).strftime("%Y-%m-%d")
        overlap_start = max(start_date, min_fore_date)
        overlap_end = min(end_date, max_fore_date)

        if overlap_start <= overlap_end:
            fore_url = "https://api.open-meteo.com/v1/forecast"
            fore_params = {
                "latitude": latitude,
                "longitude": longitude,
                "start_date": overlap_start,
                "end_date": overlap_end,
                "daily": "uv_index_max,precipitation_probability_mean",
                "timezone": "auto",
            }
            fore_res = requests.get(fore_url, params=fore_params, timeout=10)
            if fore_res.status_code == 200:
                fore_daily = fore_res.json().get("daily", {})
                date_strs = df["date"].dt.strftime("%Y-%m-%d")
                if "time" in fore_daily and "uv_index_max" in fore_daily:
                    uv_map = dict(zip(pd.to_datetime(fore_daily["time"]).strftime("%Y-%m-%d"), fore_daily["uv_index_max"]))
                    mapped_uv = date_strs.map(uv_map)
                    df["uv_index_max"] = mapped_uv.combine_first(df["uv_index_max"])
                if "time" in fore_daily and "precipitation_probability_mean" in fore_daily:
                    prob_map = dict(zip(pd.to_datetime(fore_daily["time"]).strftime("%Y-%m-%d"), fore_daily["precipitation_probability_mean"]))
                    mapped_prob = date_strs.map(prob_map)
                    df["precipitation_probability"] = mapped_prob.combine_first(df["precipitation_probability"])
    except Exception:
        pass

    if cache_file:
        df.to_csv(cache_file, index=False)

    return df


def fetch_air_quality(latitude: float, longitude: float, start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch historical air quality telemetry (european_aqi, us_aqi, pm2_5, pm10) from Open-Meteo
    and aggregate into daily averages.
    If date range is out of bounds or API fails (e.g. for older historical dates),
    returns an empty DataFrame so null values can be used.
    """
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "european_aqi,us_aqi,pm2_5,pm10",
        "timezone": "auto",
    }
    cols = ["date", "european_aqi", "us_aqi", "pm2_5", "pm10"]
    try:
        response = requests.get(url, params=params, timeout=30)
        if response.status_code != 200:
            return pd.DataFrame(columns=cols)

        payload = response.json()
        if "hourly" not in payload or "time" not in payload["hourly"]:
            return pd.DataFrame(columns=cols)

        hourly = payload["hourly"]
        hourly_df = pd.DataFrame({
            "datetime": pd.to_datetime(hourly["time"]),
            "european_aqi": hourly.get("european_aqi"),
            "us_aqi": hourly.get("us_aqi"),
            "pm2_5": hourly.get("pm2_5"),
            "pm10": hourly.get("pm10"),
        })
        hourly_df["date"] = pd.to_datetime(hourly_df["datetime"].dt.date)

        daily_aq = hourly_df.groupby("date")[["european_aqi", "us_aqi", "pm2_5", "pm10"]].mean().reset_index()
        for c in ["european_aqi", "us_aqi", "pm2_5", "pm10"]:
            daily_aq[c] = daily_aq[c].round(1)

        return daily_aq
    except Exception:
        return pd.DataFrame(columns=cols)


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
    """Compute summary statistics, trend direction, monthly averages, and dominant weathercode."""
    stats = {
        "start_date": df["date"].min().date().isoformat(),
        "end_date": df["date"].max().date().isoformat(),
        "num_days": int(len(df)),
        "avg_temp_c": round(float(df["temp_mean_c"].mean()), 2),
        "max_temp_c": round(float(df["temp_max_c"].max()), 2) if "temp_max_c" in df.columns else None,
        "min_temp_c": round(float(df["temp_min_c"].min()), 2) if "temp_min_c" in df.columns else None,
        "std_temp_c": round(float(df["temp_mean_c"].std()), 2) if len(df) > 1 else 0.0,
    }

    # Dominant weathercode across the selected period
    if "weathercode" in df.columns:
        valid_codes = df["weathercode"].dropna()
        if not valid_codes.empty:
            stats["dominant_weathercode"] = int(valid_codes.mode().iloc[0])
        else:
            stats["dominant_weathercode"] = None
    else:
        stats["dominant_weathercode"] = None

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

    # Total wet days (count of days with precipitation_mm > 0.1)
    if "precipitation_mm" in df.columns:
        valid_precip = df["precipitation_mm"].dropna()
        stats["total_wet_days"] = int((valid_precip > 0.1).sum())
    else:
        stats["total_wet_days"] = 0

    # Total precipitation_hours across the period
    if "precipitation_hours" in df.columns:
        valid_p_hours = df["precipitation_hours"].dropna()
        stats["total_precipitation_hours"] = round(float(valid_p_hours.sum()), 1) if not valid_p_hours.empty else None
    else:
        stats["total_precipitation_hours"] = None

    # Average wind speed (from wind_speed_max or windspeed_max_kmh)
    wind_col = "wind_speed_max" if "wind_speed_max" in df.columns else ("windspeed_max_kmh" if "windspeed_max_kmh" in df.columns else None)
    if wind_col:
        valid_wind = df[wind_col].dropna()
        stats["avg_wind_speed"] = round(float(valid_wind.mean()), 2) if not valid_wind.empty else None
    else:
        stats["avg_wind_speed"] = None

    # Average cloud cover
    if "cloudcover_pct" in df.columns:
        valid_cloud = df["cloudcover_pct"].dropna()
        stats["avg_cloud_cover"] = round(float(valid_cloud.mean()), 1) if not valid_cloud.empty else None
    else:
        stats["avg_cloud_cover"] = None

    # Average solar radiation
    if "solar_radiation_sum" in df.columns:
        valid_solar = df["solar_radiation_sum"].dropna()
        stats["avg_solar_radiation"] = round(float(valid_solar.mean()), 2) if not valid_solar.empty else None
    else:
        stats["avg_solar_radiation"] = None

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
        predictions = np.repeat(y[-1] if len(y) > 0 else 20.0, days_ahead)

    last_date = df["date"].max()
    future_dates = [last_date + timedelta(days=i + 1) for i in range(days_ahead)]

    forecast_df = pd.DataFrame({
        "date": future_dates,
        "forecast_temp_c": np.round(predictions, 2),
    })

    return forecast_df


# ----------------------------------------------------------------
# 6. CURRENT LIVE CONDITIONS
# ----------------------------------------------------------------
def get_current_weather(latitude: float, longitude: float) -> dict:
    """
    Fetch real-time live current weather conditions and atmospheric telemetry
    from Open-Meteo Forecast & Air Quality APIs.

    Parameters
    ----------
    latitude, longitude : float
        Coordinates of the location.

    Returns
    -------
    dict
        Current atmospheric telemetry (temperature, feels-like, dewpoint, humidity,
        precipitation, weathercode, wind speed, gusts, direction, cloud cover,
        today's UV index & sun times, and live air quality metrics).
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "dew_point_2m",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "cloud_cover",
            "wind_gusts_10m",
            "uv_index",
        ]),
        "daily": "uv_index_max,sunrise,sunset",
        "forecast_days": 1,
        "timezone": "auto",
    }

    aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    aq_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "european_aqi,us_aqi,pm2_5,pm10",
        "timezone": "auto",
    }

    def _fetch_forecast():
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()

    def _fetch_aq():
        try:
            r = requests.get(aq_url, params=aq_params, timeout=10)
            if r.status_code == 200:
                aq_json = r.json()
                aq_cur = aq_json.get("current", {})
                return {
                    "time": aq_cur.get("time"),
                    "timezone": aq_json.get("timezone"),
                    "timezone_abbreviation": aq_json.get("timezone_abbreviation"),
                    "european_aqi": aq_cur.get("european_aqi"),
                    "us_aqi": aq_cur.get("us_aqi"),
                    "pm2_5": aq_cur.get("pm2_5"),
                    "pm10": aq_cur.get("pm10"),
                }
        except Exception as e:
            print(f"[LIVE AQ WARNING] Failed to fetch live air quality: {e}")
        return {}

    with ThreadPoolExecutor(max_workers=2) as executor:
        f_future = executor.submit(_fetch_forecast)
        aq_future = executor.submit(_fetch_aq)
        data = f_future.result()
        aq_data = aq_future.result()

    print(f"[LIVE FETCH {datetime.now().strftime('%H:%M:%S.%f')[:-3]}] Direct request to Open-Meteo for lat={latitude}, lon={longitude} (gen_time: {data.get('generationtime_ms', 0):.3f}ms)")

    cur = data.get("current", {})
    daily = data.get("daily", {})

    temp_c = cur.get("temperature_2m")
    temp_f = round((temp_c * 9 / 5 + 32), 1) if temp_c is not None else None
    feels_c = cur.get("apparent_temperature")
    feels_f = round((feels_c * 9 / 5 + 32), 1) if feels_c is not None else None
    dew_c = cur.get("dew_point_2m")
    dew_f = round((dew_c * 9 / 5 + 32), 1) if dew_c is not None else None

    uv_today = daily.get("uv_index_max", [None])[0] if daily.get("uv_index_max") else None
    sunrise_today = daily.get("sunrise", [None])[0] if daily.get("sunrise") else None
    sunset_today = daily.get("sunset", [None])[0] if daily.get("sunset") else None

    return {
        "time": cur.get("time"),
        "timezone": data.get("timezone"),
        "timezone_abbreviation": data.get("timezone_abbreviation"),
        "temperature_c": temp_c,
        "temperature_f": temp_f,
        "feels_like_c": feels_c,
        "feels_like_f": feels_f,
        "dewpoint_c": dew_c,
        "dewpoint_f": dew_f,
        "humidity_pct": cur.get("relative_humidity_2m"),
        "precipitation_mm": cur.get("precipitation"),
        "weathercode": cur.get("weather_code"),
        "wind_speed_kmh": cur.get("wind_speed_10m"),
        "wind_gusts_kmh": cur.get("wind_gusts_10m"),
        "wind_direction": cur.get("wind_direction_10m"),
        "cloud_cover_pct": cur.get("cloud_cover"),
        "uv_index": cur.get("uv_index"),
        "uv_index_live": cur.get("uv_index"),
        "uv_index_today": uv_today,
        "sunrise_today": sunrise_today,
        "sunset_today": sunset_today,
        "air_quality": aq_data,
    }

