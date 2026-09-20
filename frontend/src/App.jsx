import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lottie } from 'lottie-react';

import LocationForm from './components/LocationForm';
import StatsPanel from './components/StatsPanel';
import HumidityPanel from './components/HumidityPanel';
import UVIndexPanel from './components/UVIndexPanel';
import SunriseSunsetPanel from './components/SunriseSunsetPanel';
import AirQualityPanel from './components/AirQualityPanel';
import TrendChart from './components/TrendChart';
import Histogram from './components/Histogram';
import ForecastChart from './components/ForecastChart';

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

  // Lottie Animation play/pause control
  const [isLottiePlaying, setIsLottiePlaying] = useState(true);
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
    if (isLottiePlaying) {
      lottieRef.current?.pause();
    } else {
      lottieRef.current?.play();
    }
    setIsLottiePlaying(!isLottiePlaying);
  };

  const fetchWeatherData = async (params) => {
    setLoading(true);
    setError(null);
    setLastQuery(params);
    if (params.locationName) {
      setCurrentLocationName(params.locationName);
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
      lat: 17.78,
      lon: 82.13,
      start: sixMonthsAgo,
      end: today,
      locationName: 'Peddapuram, Andhra Pradesh, India',
    });
  }, []);

  const weatherDetails = getWeatherDetails(stats?.dominant_weathercode);

  return (
    <div className="google-weather-app" data-theme={theme}>
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
            {/* Hero Section with Dynamic Soft Lottie Background */}
            <section className="weather-hero-card">
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

                  {/* Play/Pause Animation Toggle */}
                  <button
                    type="button"
                    className="animation-toggle-btn"
                    onClick={toggleAnimationPlay}
                    title={isLottiePlaying ? 'Pause background animation' : 'Play background animation'}
                    aria-label="Toggle background animation"
                  >
                    {isLottiePlaying ? '⏸' : '▶'}
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
              </div>
            </section>

            {/* Core Statistics Card */}
            <section className="stats-section">
              <StatsPanel stats={stats} />
            </section>

            {/* 4-Card Telemetry Grid */}
            <section className="telemetry-grid">
              <HumidityPanel daily={daily} />
              <UVIndexPanel daily={daily} />
              <SunriseSunsetPanel daily={daily} />
              <AirQualityPanel daily={daily} />
            </section>

            {/* Charts Deck */}
            <section className="charts-feed">
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
