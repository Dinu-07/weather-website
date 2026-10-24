import axios from 'axios';

// In-memory cache for live weather: key -> { timestamp, data }
const liveCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(lat, lon) {
  return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
}

/**
 * Fetch live weather directly from Open-Meteo in the browser,
 * falling back to the backend `/api/current` endpoint if the browser call fails.
 * Cached in memory for 10 minutes per rounded (lat, lon, 2 decimals).
 */
export async function getLiveWeather(lat, lon, baseUrl, forceRefresh = false) {
  const cacheKey = getCacheKey(lat, lon);

  if (!forceRefresh) {
    const cached = liveCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // 1. Primary: Browser-Direct Fetch from Open-Meteo
  try {
    const forecastUrl = 'https://api.open-meteo.com/v1/forecast';
    const forecastParams = {
      latitude: lat,
      longitude: lon,
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'dew_point_2m',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'cloud_cover',
        'wind_gusts_10m',
        'uv_index',
      ].join(','),
      daily: 'uv_index_max,sunrise,sunset',
      forecast_days: 1,
      timezone: 'auto',
    };

    const aqUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';
    const aqParams = {
      latitude: lat,
      longitude: lon,
      current: 'european_aqi,us_aqi,pm2_5,pm10',
      timezone: 'auto',
    };

    const forecastReq = axios.get(forecastUrl, { params: forecastParams, timeout: 8000 });
    const aqReq = axios.get(aqUrl, { params: aqParams, timeout: 8000 }).catch((err) => {
      console.warn('Direct AQ fetch warning, continuing without live AQ:', err.message);
      return { data: {} };
    });

    const [forecastRes, aqRes] = await Promise.all([forecastReq, aqReq]);
    const fData = forecastRes.data || {};
    const aqData = aqRes.data || {};

    const cur = fData.current || {};
    const daily = fData.daily || {};

    const temp_c = cur.temperature_2m ?? null;
    const temp_f = temp_c !== null ? Number(((temp_c * 9) / 5 + 32).toFixed(1)) : null;
    const feels_c = cur.apparent_temperature ?? null;
    const feels_f = feels_c !== null ? Number(((feels_c * 9) / 5 + 32).toFixed(1)) : null;
    const dew_c = cur.dew_point_2m ?? null;
    const dew_f = dew_c !== null ? Number(((dew_c * 9) / 5 + 32).toFixed(1)) : null;

    const uv_today =
      Array.isArray(daily.uv_index_max) && daily.uv_index_max.length > 0
        ? daily.uv_index_max[0]
        : null;
    const sunrise_today =
      Array.isArray(daily.sunrise) && daily.sunrise.length > 0 ? daily.sunrise[0] : null;
    const sunset_today =
      Array.isArray(daily.sunset) && daily.sunset.length > 0 ? daily.sunset[0] : null;

    const aqCur = aqData.current || {};
    const aqFormatted = {
      time: aqCur.time ?? null,
      timezone: aqData.timezone ?? null,
      timezone_abbreviation: aqData.timezone_abbreviation ?? null,
      european_aqi: aqCur.european_aqi ?? null,
      us_aqi: aqCur.us_aqi ?? null,
      pm2_5: aqCur.pm2_5 ?? null,
      pm10: aqCur.pm10 ?? null,
    };

    const mapped = {
      time: cur.time ?? null,
      timezone: fData.timezone ?? null,
      timezone_abbreviation: fData.timezone_abbreviation ?? null,
      temperature_c: temp_c,
      temperature_f: temp_f,
      feels_like_c: feels_c,
      feels_like_f: feels_f,
      dewpoint_c: dew_c,
      dewpoint_f: dew_f,
      humidity_pct: cur.relative_humidity_2m ?? null,
      precipitation_mm: cur.precipitation ?? null,
      weathercode: cur.weather_code ?? null,
      wind_speed_kmh: cur.wind_speed_10m ?? null,
      wind_gusts_kmh: cur.wind_gusts_10m ?? null,
      wind_direction: cur.wind_direction_10m ?? null,
      cloud_cover_pct: cur.cloud_cover ?? null,
      uv_index: cur.uv_index ?? null,
      uv_index_live: cur.uv_index ?? null,
      uv_index_today: uv_today,
      sunrise_today: sunrise_today,
      sunset_today: sunset_today,
      air_quality: aqFormatted,
    };

    liveCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
    return mapped;
  } catch (browserErr) {
    console.warn('Browser-direct live weather failed, falling back to backend:', browserErr.message);

    // 2. Fallback: Backend /api/current
    try {
      const res = await axios.get(`${baseUrl}/api/current`, {
        params: { lat, lon },
        timeout: 10000,
      });
      const data = res.data;
      liveCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch (backendErr) {
      console.error('Backend fallback also failed:', backendErr);
      const friendlyMessage =
        backendErr.response?.data?.message ||
        'Live data is temporarily busy. Please try again shortly.';
      throw new Error(friendlyMessage);
    }
  }
}
