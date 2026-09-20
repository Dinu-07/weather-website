import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LocationForm from './components/LocationForm';
import TrendChart from './components/TrendChart';
import Histogram from './components/Histogram';
import ForecastChart from './components/ForecastChart';
import StatsPanel from './components/StatsPanel';
import './App.css';

export default function App() {
  const [daily, setDaily] = useState([]);
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);

  const fetchWeatherData = async (params) => {
    setLoading(true);
    setError(null);
    setLastQuery(params);

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
    });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-badge">Open-Meteo Historical Archive</div>
        <h1 className="app-title">Weather Data Analysis System</h1>
        <p className="app-subtitle">
          Interactive temperature trends, distribution modeling, and short-term linear regression forecasting.
        </p>
      </header>

      <main className="dashboard-content">
        <LocationForm onSubmit={fetchWeatherData} isLoading={loading} />

        {error && (
          <div className="card error-banner">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h4>Unable to load weather data</h4>
              <p>{error}</p>
              {lastQuery && (
                <button
                  type="button"
                  className="retry-btn"
                  onClick={() => fetchWeatherData(lastQuery)}
                >
                  Retry Request
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="card loading-card">
            <div className="spinner" />
            <p className="loading-text">
              Retrieving and analyzing weather data from Open-Meteo...
            </p>
          </div>
        )}

        {!loading && !error && stats && (
          <div className="results-container">
            <StatsPanel stats={stats} />

            <div className="charts-grid">
              <div className="chart-full-width">
                <TrendChart daily={daily} />
              </div>

              <div className="chart-half-width">
                <Histogram daily={daily} stats={stats} />
              </div>

              <div className="chart-half-width">
                <ForecastChart daily={daily} forecast={forecast} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Data provided by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo Historical Weather API
          </a>{' '}
          &bull; Trend analysis and regression pipeline powered by FastAPI.
        </p>
      </footer>
    </div>
  );
}
