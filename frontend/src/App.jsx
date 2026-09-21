import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lottie } from 'lottie-react';

import LocationForm from './components/LocationForm';
import StatsPanel from './components/StatsPanel';
import HumidityPanel from './components/HumidityPanel';
import UVIndexPanel from './components/UVIndexPanel';
import SunriseSunsetPanel from './components/SunriseSunsetPanel';
import AirQualityPanel from './components/AirQualityPanel';
import WindPanel from './components/WindPanel';
import PrecipitationPanel from './components/PrecipitationPanel';
import SolarCloudPanel from './components/SolarCloudPanel';
import FeelsLikePanel from './components/FeelsLikePanel';
import TrendChart from './components/TrendChart';
import Histogram from './components/Histogram';
import ForecastChart from './components/ForecastChart';

import FullPageAmbientBackground from './components/FullPageAmbientBackground';
import WaterDroplets from './components/WaterDroplets';
import CurrentConditionsPanel from './components/CurrentConditionsPanel';

import sunnyAnim from './assets/lottie/sunny.json';
import cloudyAnim from './assets/lottie/cloudy.json';
import rainyAnim from './assets/lottie/rainy.json';
import snowyAnim from './assets/lottie/snowy.json';
import stormyAnim from './assets/lottie/stormy.json';

import './App.css';

// Map WMO dominant weathercode to readable condition and Lottie animation
function getWeatherDetails(code) {
  if (code === null || code === undefined) {
    return { condition: 'Clear Conditions', animation: sunnyAnim };
  }

  if (code === 0) {
    return { condition: 'Clear Sky', animation: sunnyAnim };
  }
  if (code === 1) {
    return { condition: 'Mainly Clear', animation: cloudyAnim };
  }
  if (code === 2) {
    return { condition: 'Partly Cloudy', animation: cloudyAnim };
  }
  if (code === 3) {
    return { condition: 'Overcast', animation: cloudyAnim };
  }
  if (code === 45 || code === 48) {
    return { condition: 'Foggy / Hazy', animation: cloudyAnim };
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return { condition: 'Drizzle', animation: rainyAnim };
  }
  if ([61, 63, 65, 66, 67].includes(code)) {
    return { condition: 'Rain', animation: rainyAnim };
  }
  if ([80, 81, 82].includes(code)) {
    return { condition: 'Rain Showers', animation: rainyAnim };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { condition: 'Snow', animation: snowyAnim };
  }
  if ([95, 96, 99].includes(code)) {
    return { condition: 'Thunderstorm', animation: stormyAnim };
  }

  return { condition: 'Fair Weather', animation: sunnyAnim };
}

export default function App() {
  // Theme state: light or dark, persisted to localStorage
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [daily, setDaily] = useState([]);
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Peddapuram, Andhra Pradesh, India');

  // Live "Right Now" current conditions state
  const [currentWeather, setCurrentWeather] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [currentCoords, setCurrentCoords] = useState({ lat: 17.08, lon: 82.13 });

  // Master Animation play/pause control (controls canvas particles, CSS animations, and Lottie)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(true);
  const lottieRef = useRef(null);

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleAnimationPlay = () => {
    if (isAnimationPlaying) {
      lottieRef.current?.pause();
    } else {
      lottieRef.current?.play();
    }
    setIsAnimationPlaying(!isAnimationPlaying);
  };

  const fetchCurrentConditions = async (lat, lon) => {
    setCurrentLoading(true);
    setCurrentError(null);
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const res = await axios.get(`${baseUrl}/api/current`, {
        params: { lat, lon },
      });
      setCurrentWeather(res.data);
    } catch (err) {
      console.error('Current Weather Error:', err);
      setCurrentError(
        err.response?.data?.detail || err.message || 'Unable to load live current conditions'
      );
    } finally {
      setCurrentLoading(false);
    }
  };

  const fetchWeatherData = async (params) => {
    setLoading(true);
    setError(null);
    setLastQuery(params);
    if (params.locationName) {
      setCurrentLocationName(params.locationName);
    }

    // Always fetch live current conditions whenever location is selected
    if (params.lat !== undefined && params.lon !== undefined) {
      setCurrentCoords({ lat: params.lat, lon: params.lon });
      fetchCurrentConditions(params.lat, params.lon);
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`${baseUrl}/api/weather`, {
          params: {
            lat: params.lat,
            lon: params.lon,
            start: params.start,
            end: params.end,
          },
        }),
        axios.get(`${baseUrl}/api/forecast`, {
          params: {
            lat: params.lat,
            lon: params.lon,
            start: params.start,
            end: params.end,
            days: 7,
          },
        }),
      ]);

      setDaily(weatherRes.data.daily || []);
      setStats(weatherRes.data.stats || null);
      setForecast(forecastRes.data.forecast || []);
    } catch (err) {
      console.error('API Error:', err);
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Failed to fetch weather data. Open-Meteo may have no records for this coordinate or date range.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount (Peddapuram default)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    fetchWeatherData({
      lat: 17.08,
      lon: 82.13,
      start: sixMonthsAgo,
      end: today,
      locationName: 'Peddapuram, Andhra Pradesh, India',
    });
    fetchCurrentConditions(17.08, 82.13);
  }, []);

  const weatherDetails = getWeatherDetails(stats?.dominant_weathercode);
  const isRainyPeriod = Boolean(
    stats &&
    stats.num_days > 0 &&
    (stats.total_wet_days || 0) / stats.num_days >= 0.35
  );

  // Live "Right Now" conditions take primary priority for the full-page ambient background.
  // Historical dominant_weathercode serves as fallback only if live data hasn't loaded or failed.
  const ambientWeathercode =
    currentWeather?.weathercode !== undefined && currentWeather?.weathercode !== null
      ? currentWeather.weathercode
      : stats?.dominant_weathercode;

  const ambientWindSpeed =
    currentWeather?.wind_speed_kmh !== undefined && currentWeather?.wind_speed_kmh !== null
      ? currentWeather.wind_speed_kmh
      : (stats?.avg_wind_speed ?? 10);

  // Cloud cover heuristic for live conditions (0: clear ~10%, 1: mainly clear ~25%, 2: partly cloudy ~50%, 3: overcast ~85%, rain/storm ~90%)
  const ambientCloudCover = (() => {
    if (currentWeather?.weathercode !== undefined && currentWeather?.weathercode !== null) {
      const code = currentWeather.weathercode;
      if (code === 0) return 10;
      if (code === 1) return 25;
      if (code === 2) return 50;
      if (code === 3) return 85;
      if ([45, 48].includes(code)) return 80;
      if (code >= 51) return 90;
      return 50;
    }
    return stats?.avg_cloud_cover ?? 50;
  })();

  const ambientTotalWetDays =
    currentWeather?.precipitation_mm !== undefined && currentWeather?.precipitation_mm !== null
      ? (currentWeather.precipitation_mm > 0 ? 1 : 0)
      : (stats?.total_wet_days ?? 0);

  const ambientTotalDays =
    currentWeather?.precipitation_mm !== undefined && currentWeather?.precipitation_mm !== null
      ? 1
      : (stats?.num_days ?? 1);

  return (
    <div className="google-weather-app" data-theme={theme}>
      {/* Fixed Full-Viewport Ambient Weather Background Layer (driven primarily by live Right Now conditions) */}
      <FullPageAmbientBackground
        theme={theme}
        weathercode={ambientWeathercode}
        cloudCover={ambientCloudCover}
        totalWetDays={ambientTotalWetDays}
        totalDays={ambientTotalDays}
        windSpeed={ambientWindSpeed}
        isPlaying={isAnimationPlaying}
      />

      <div className="feed-container">
        {/* Top App Bar */}
        <header className="app-top-bar">
          <div className="brand-lockup">
            <span className="brand-weather-icon">⛅</span>
            <div className="brand-text">
              <h1 className="brand-title">Weather</h1>
              <span className="brand-badge">Historical & Forecast</span>
            </div>
          </div>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
            <span className="theme-toggle-label">
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </button>
        </header>

        {/* Pill-shaped Location Search Bar */}
        <section className="search-section">
          <LocationForm onSubmit={fetchWeatherData} isLoading={loading} />
        </section>

        {/* Live "Right Now" Current Conditions Panel */}
        <CurrentConditionsPanel
          current={currentWeather}
          locationName={currentLocationName}
          isLoading={currentLoading}
          error={currentError}
          onRefresh={() => fetchCurrentConditions(currentCoords.lat, currentCoords.lon)}
        />

        {/* Error Banner */}
        {error && (
          <section className="error-card">
            <div className="error-card-inner">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <h4>Unable to Load Weather Data</h4>
                <p>{error}</p>
                {lastQuery && (
                  <button
                    type="button"
                    className="retry-btn"
                    onClick={() => fetchWeatherData(lastQuery)}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Loading Indicator */}
        {loading && (
          <section className="loading-card">
            <div className="loading-spinner" />
            <p className="loading-text">Fetching atmospheric data...</p>
          </section>
        )}

        {/* Main Weather Feed */}
        {!loading && !error && stats && (
          <main className="weather-main-feed">
            {/* Hero Section with Soft Condition Lottie Background */}
            <section className="weather-hero-card stagger-card stagger-delay-1">
              {/* Surface Condensation Water Droplets if rainy period (wet days >= 35%) */}
              {isRainyPeriod && <WaterDroplets isPlaying={isAnimationPlaying} />}

              {/* Weather Art Lottie Backdrop */}
              <div className="hero-lottie-backdrop">
                <Lottie
                  lottieRef={lottieRef}
                  src={weatherDetails.animation}
                  loop={true}
                  autoplay={true}
                  className="lottie-canvas"
                />
              </div>

              <div className="hero-content">
                <div className="hero-header-row">
                  <div className="hero-location-info">
                    <h2 className="hero-place-name">{currentLocationName}</h2>
                    <span className="hero-date-range">
                      {stats.start_date} – {stats.end_date} • {stats.num_days} days
                    </span>
                  </div>

                  {/* Master Play/Pause Animation Toggle */}
                  <button
                    type="button"
                    className="animation-toggle-btn"
                    onClick={toggleAnimationPlay}
                    title={isAnimationPlaying ? 'Pause background animations' : 'Play background animations'}
                    aria-label="Toggle background animations"
                  >
                    {isAnimationPlaying ? '⏸' : '▶'}
                  </button>
                </div>

                <div className="hero-temp-condition">
                  <div className="hero-temperature">
                    <span className="hero-temp-num">
                      {stats.avg_temp_c !== null && stats.avg_temp_c !== undefined
                        ? stats.avg_temp_c.toFixed(1)
                        : '--'}
                    </span>
                    <span className="hero-temp-unit">°C</span>
                    <span className="hero-temp-fahrenheit">
                      {stats.avg_temp_c !== null && stats.avg_temp_c !== undefined
                        ? ` / ${((stats.avg_temp_c * 9) / 5 + 32).toFixed(1)}°F`
                        : ''}
                    </span>
                  </div>

                  <div className="hero-condition-badge">
                    <span className="hero-condition-text">
                      {weatherDetails.condition}
                    </span>
                  </div>
                </div>

                {/* Explanatory note clarifying historical mean vs live right now */}
                <div className="hero-mean-explanation-pill">
                  <span className="explanation-icon">ℹ️</span>
                  <span>Showing daily mean across selected dates. See <strong>Right Now</strong> above for current live conditions.</span>
                </div>
              </div>
            </section>

            {/* Core Statistics Card */}
            <section className="stats-section stagger-card stagger-delay-2">
              <StatsPanel stats={stats} />
            </section>

            {/* Telemetry Group 1: Comfort & Atmosphere */}
            <section className="telemetry-section-group stagger-card stagger-delay-3">
              <div className="telemetry-group-header">
                <h4 className="telemetry-group-title">Comfort & Atmosphere</h4>
              </div>
              <div className="telemetry-grid">
                <FeelsLikePanel daily={daily} stats={stats} live={currentWeather} />
                <HumidityPanel daily={daily} live={currentWeather} />
                <AirQualityPanel daily={daily} live={currentWeather} />
                <UVIndexPanel daily={daily} live={currentWeather} />
              </div>
            </section>

            {/* Telemetry Group 2: Wind, Sky & Sunlight */}
            <section className="telemetry-section-group stagger-card stagger-delay-4">
              <div className="telemetry-group-header">
                <h4 className="telemetry-group-title">Wind, Sky & Sunlight</h4>
              </div>
              <div className="telemetry-grid">
                <WindPanel daily={daily} stats={stats} live={currentWeather} />
                <PrecipitationPanel daily={daily} stats={stats} live={currentWeather} />
                <SolarCloudPanel daily={daily} stats={stats} live={currentWeather} />
                <SunriseSunsetPanel daily={daily} live={currentWeather} />
              </div>
            </section>

            {/* Charts Deck */}
            <section className="charts-feed stagger-card stagger-delay-5">
              <div className="weather-card chart-full-card">
                <TrendChart daily={daily} />
              </div>

              <div className="charts-two-col-grid">
                <div className="weather-card">
                  <Histogram daily={daily} stats={stats} />
                </div>
                <div className="weather-card">
                  <ForecastChart daily={daily} forecast={forecast} />
                </div>
              </div>
            </section>
          </main>
        )}

        {/* Minimal Subtle Attribution Footer */}
        <footer className="app-footer">
          <span>Data: Open-Meteo</span>
        </footer>
      </div>
    </div>
  );
}
