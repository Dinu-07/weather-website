import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lottie } from 'lottie-react';

import LocationForm from './components/LocationForm';
import ErrorState from './components/ErrorState';
import { getLiveWeather } from './utils/liveWeather';
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
import WeatherPulseLogo from './components/WeatherPulseLogo';
import SplashScreen from './components/SplashScreen';
import Hero, { CONDITION_METADATA } from './components/Hero';
import { reverseGeocode } from './utils/reverseGeocode';

import sunnyAnim from './assets/lottie/sunny.json';
import cloudyAnim from './assets/lottie/cloudy.json';
import rainyAnim from './assets/lottie/rainy.json';
import snowyAnim from './assets/lottie/snowy.json';
import stormyAnim from './assets/lottie/stormy.json';

import './App.css';

// Clear any legacy saved location from previous builds — one-time on module load.
try { localStorage.removeItem('wp:location'); } catch { /* ignore */ }

// Map WMO dominant weathercode to readable condition and Lottie animation
function getWeatherDetails(code) {
  if (code === null || code === undefined) {
    return { condition: 'Clear Conditions', animation: sunnyAnim };
  }
  if (code === 0) return { condition: 'Clear Sky', animation: sunnyAnim };
  if (code === 1) return { condition: 'Mainly Clear', animation: cloudyAnim };
  if (code === 2) return { condition: 'Partly Cloudy', animation: cloudyAnim };
  if (code === 3) return { condition: 'Overcast', animation: cloudyAnim };
  if (code === 45 || code === 48) return { condition: 'Foggy / Hazy', animation: cloudyAnim };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Drizzle', animation: rainyAnim };
  if ([61, 63, 65, 66, 67].includes(code)) return { condition: 'Rain', animation: rainyAnim };
  if ([80, 81, 82].includes(code)) return { condition: 'Rain Showers', animation: rainyAnim };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', animation: snowyAnim };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', animation: stormyAnim };
  return { condition: 'Fair Weather', animation: sunnyAnim };
}

// Shared geolocation helper used by both page-load flow and the crosshair button.
// Calls getCurrentPosition once (no watchPosition). Resolves with { lat, lon } or rejects.
function detectMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('Peddapuram, Andhra Pradesh, India');

  // Guard against React StrictMode double-invocation on page load
  const geoRequestedRef  = useRef(false);
  const defaultLoadedRef = useRef(false);
  const fallbackTimerRef = useRef(null);
  const searchInputRef   = useRef(null); // forwarded to LocationForm

  // Live "Right Now" current conditions state
  const [currentWeather, setCurrentWeather] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [currentCoords, setCurrentCoords] = useState({ lat: 17.08, lon: 82.13 });

  // Master Animation play/pause control
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(true);
  const lottieRef = useRef(null);

  // Splash screen completion state
  const [splashDone, setSplashDone] = useState(false);

  // Hero entrance animation completion state
  const [heroEntranceDone, setHeroEntranceDone] = useState(false);

  // Featured condition preview state
  const [previewCondition, setPreviewCondition] = useState(null);

  // Sync theme to document root and meta theme-color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const bg = theme === 'dark' ? '#232C4D' : '#DDEBFA';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', bg);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const toggleAnimationPlay = () => {
    if (isAnimationPlaying) {
      lottieRef.current?.pause();
    } else {
      lottieRef.current?.play();
    }
    setIsAnimationPlaying(!isAnimationPlaying);
  };

  const fetchCurrentConditions = async (lat, lon, forceRefresh = false) => {
    setCurrentLoading(true);
    setCurrentError(null);
    const baseUrl = import.meta.env.VITE_API_URL;
    try {
      const data = await getLiveWeather(lat, lon, baseUrl, forceRefresh);
      setCurrentWeather(data);
    } catch (err) {
      console.error('Current Weather Error:', err);
      setCurrentError(
        err.message || 'Live data is temporarily busy. Please try again shortly.'
      );
    } finally {
      setCurrentLoading(false);
    }
  };

  const fetchWeatherData = async (params) => {
    setLoading(true);
    setError(null);
    setLastQuery(params);
    if (params.locationName) setCurrentLocationName(params.locationName);

    if (params.lat !== undefined && params.lon !== undefined) {
      setCurrentCoords({ lat: params.lat, lon: params.lon });
      fetchCurrentConditions(params.lat, params.lon);
    }

    const baseUrl = import.meta.env.VITE_API_URL;
    try {
      const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`${baseUrl}/api/weather`, {
          params: { lat: params.lat, lon: params.lon, start: params.start, end: params.end },
        }),
        axios.get(`${baseUrl}/api/forecast`, {
          params: { lat: params.lat, lon: params.lon, start: params.start, end: params.end, days: 7 },
        }),
      ]);
      setDaily(weatherRes.data.daily || []);
      setStats(weatherRes.data.stats || null);
      setForecast(forecastRes.data.forecast || []);
    } catch (err) {
      console.error('API Error:', err);
      const friendlyMsg =
        err.response?.data?.message ||
        'Weather data is temporarily busy. Please try again shortly.';
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  // Default location loader (Peddapuram fallback)
  const loadDefaultLocation = () => {
    if (defaultLoadedRef.current) return;
    defaultLoadedRef.current = true;
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fetchWeatherData({
      lat: 17.08,
      lon: 82.13,
      start: sixMonthsAgo,
      end: today,
      locationName: 'Peddapuram, Andhra Pradesh, India',
    });
    fetchCurrentConditions(17.08, 82.13);
  };

  // Run full weather analysis for a detected position
  const applyDetectedLocation = (lat, lon, name) => {
    setCurrentLocationName(name);
    setCurrentCoords({ lat, lon });
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fetchWeatherData({ lat, lon, start: sixMonthsAgo, end: today, locationName: name });
    fetchCurrentConditions(lat, lon);
  };

  // Page-load: after splash and hero entrance, call detectMyLocation() once
  useEffect(() => {
    if (!splashDone || !heroEntranceDone) return;
    if (geoRequestedRef.current) return;
    geoRequestedRef.current = true;

    if (!navigator.geolocation) {
      loadDefaultLocation();
      return;
    }

    // Fallback timer: load default if nothing resolves in 13 s
    fallbackTimerRef.current = setTimeout(() => {
      loadDefaultLocation();
    }, 13000);

    const tryDetect = async () => {
      try {
        const { lat, lon } = await detectMyLocation();
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        if (defaultLoadedRef.current) return; // fallback already fired

        const name = await reverseGeocode(lat, lon);
        applyDetectedLocation(lat, lon, name);
      } catch {
        // denied, timeout, or any other error — silently use default
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        loadDefaultLocation();
      }
    };

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'denied') {
            clearTimeout(fallbackTimerRef.current);
            loadDefaultLocation();
          } else {
            tryDetect();
          }
        })
        .catch(() => tryDetect());
    } else {
      tryDetect();
    }

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [splashDone, heroEntranceDone]);

  const weatherDetails = getWeatherDetails(stats?.dominant_weathercode);
  const isRainyPeriod = Boolean(
    stats && stats.num_days > 0 && (stats.total_wet_days || 0) / stats.num_days >= 0.35
  );

  const ambientWeathercode =
    currentWeather?.weathercode !== undefined && currentWeather?.weathercode !== null
      ? currentWeather.weathercode
      : stats?.dominant_weathercode;

  const ambientWindSpeed =
    currentWeather?.wind_speed_kmh !== undefined && currentWeather?.wind_speed_kmh !== null
      ? currentWeather.wind_speed_kmh
      : (stats?.avg_wind_speed ?? 10);

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

  const previewDetails = previewCondition ? CONDITION_METADATA[previewCondition] : null;
  const activeAmbientWeathercode = previewDetails ? previewDetails.weathercode : ambientWeathercode;
  const activeCloudCover = previewDetails
    ? (previewDetails.key === 'clear' ? 10 : previewDetails.key === 'cloudy' ? 85 : previewDetails.key === 'fog' ? 80 : 90)
    : ambientCloudCover;
  const activeTotalWetDays = previewDetails
    ? (['rain', 'storm'].includes(previewDetails.key) ? 1 : 0)
    : ambientTotalWetDays;

  return (
    <div className="google-weather-app" data-theme={theme}>
      {/* Branded Splash Screen on initial page load */}
      {!splashDone && (
        <SplashScreen theme={theme} onFinish={() => setSplashDone(true)} />
      )}

      {/* Fixed Full-Viewport Ambient Weather Background Layer */}
      <FullPageAmbientBackground
        theme={theme}
        weathercode={activeAmbientWeathercode}
        cloudCover={activeCloudCover}
        totalWetDays={activeTotalWetDays}
        totalDays={ambientTotalDays}
        windSpeed={ambientWindSpeed}
        isPlaying={isAnimationPlaying && splashDone}
      />

      {/* Dark Contrast Overlay for Ambient Sky Layer */}
      <div className="hero-backdrop-contrast-overlay" aria-hidden="true" />

      {/* Full-Viewport Cinematic Branded Hero */}
      <Hero
        theme={theme}
        currentWeather={currentWeather}
        locationName={currentLocationName}
        splashDone={splashDone}
        onEntranceFinish={() => setHeroEntranceDone(true)}
        previewCondition={previewCondition}
        onPreviewChange={(cond) => setPreviewCondition(cond)}
      />

      <div className="feed-container" id="dashboard">
        {/* Top App Bar */}
        <header className="app-top-bar">
          <div className="brand-lockup">
            <WeatherPulseLogo theme={theme} height={50} />
            <h1 className="sr-only">WeatherPulse</h1>
            <span className="brand-badge">Historical &amp; Forecast</span>
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
        <section className="search-section" id="search-section">
          <LocationForm
            onSubmit={(params) => fetchWeatherData(params)}
            isLoading={loading}
            currentLocationName={currentLocationName}
            searchInputRef={searchInputRef}
            detectMyLocation={detectMyLocation}
            reverseGeocode={reverseGeocode}
            onDetected={applyDetectedLocation}
          />
        </section>

        {/* Live "Right Now" Current Conditions Panel */}
        <CurrentConditionsPanel
          current={currentWeather}
          locationName={currentLocationName}
          isLoading={currentLoading}
          error={currentError}
          onRefresh={() => fetchCurrentConditions(currentCoords.lat, currentCoords.lon, true)}
        />

        {/* Error Banner */}
        {error && (
          <section className="error-card">
            <ErrorState
              title="Unable to Load Weather Data"
              message={error}
              onRetry={lastQuery ? () => fetchWeatherData(lastQuery) : null}
              autoRetry={true}
            />
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
              {isRainyPeriod && <WaterDroplets isPlaying={isAnimationPlaying} />}

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
                    <span className="hero-condition-text">{weatherDetails.condition}</span>
                  </div>
                </div>

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
            <section className="telemetry-section-group stagger-card stagger-delay-3" id="telemetry-section">
              <div className="telemetry-group-header">
                <h4 className="telemetry-group-title">Comfort &amp; Atmosphere</h4>
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
                <h4 className="telemetry-group-title">Wind, Sky &amp; Sunlight</h4>
              </div>
              <div className="telemetry-grid">
                <WindPanel daily={daily} stats={stats} live={currentWeather} />
                <PrecipitationPanel daily={daily} stats={stats} live={currentWeather} />
                <SolarCloudPanel daily={daily} stats={stats} live={currentWeather} />
                <SunriseSunsetPanel daily={daily} live={currentWeather} />
              </div>
            </section>

            {/* Charts Deck */}
            <section className="charts-feed stagger-card stagger-delay-5" id="trends-section">
              <div className="weather-card chart-full-card">
                <TrendChart daily={daily} />
              </div>

              <div className="charts-two-col-grid">
                <div className="weather-card">
                  <Histogram daily={daily} stats={stats} />
                </div>
                <div className="weather-card" id="forecast-section">
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
