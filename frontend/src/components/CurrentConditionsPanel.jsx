import React from 'react';

/**
 * WMO Weather Code Mapping to Condition Label & Icon
 */
function getCurrentCondition(code) {
  if (code === null || code === undefined) {
    return { label: 'Clear Conditions', icon: '☀️' };
  }
  if (code === 0) return { label: 'Clear Sky', icon: '☀️' };
  if (code === 1) return { label: 'Mainly Clear', icon: '🌤️' };
  if (code === 2) return { label: 'Partly Cloudy', icon: '⛅' };
  if (code === 3) return { label: 'Overcast', icon: '☁️' };
  if (code === 45 || code === 48) return { label: 'Fog / Mist', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', icon: '🌦️' };
  if ([61, 63, 65, 66, 67].includes(code)) return { label: 'Rain', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', icon: '🌨️' };
  if ([80, 81, 82].includes(code)) return { label: 'Rain Showers', icon: '🌧️' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Fair Weather', icon: '⛅' };
}

/**
 * Convert degree angle to cardinal direction
 */
function getCardinal(deg) {
  if (deg === null || deg === undefined || isNaN(deg)) return '';
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return cardinals[idx];
}

/**
 * Format observation timestamp into readable local time
 */
function formatTime(isoStr, tzAbbr) {
  if (!isoStr) return '';
  try {
    const parts = isoStr.split('T');
    if (parts.length === 2) {
      const [year, month, day] = parts[0].split('-').map(Number);
      const [hour, min] = parts[1].split(':').map(Number);
      const d = new Date(year, month - 1, day, hour, min);
      const formatted = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return tzAbbr ? `${formatted} (${tzAbbr})` : formatted;
    }
  } catch {
    // fallback
  }
  return isoStr.replace('T', ' ');
}

export default function CurrentConditionsPanel({
  current,
  locationName = '',
  isLoading = false,
  error = null,
  onRefresh = () => {},
}) {
  const condition = getCurrentCondition(current?.weathercode);
  const cardinal = getCardinal(current?.wind_direction);
  const timeFormatted = formatTime(current?.time, current?.timezone_abbreviation);

  return (
    <section className="current-conditions-section stagger-card">
      <div className="current-conditions-card">
        {/* Top Row: Live Indicator, Title, Location, and Observation Timestamp */}
        <div className="current-header-row">
          <div className="current-header-left">
            <div className="live-indicator-pill">
              <span className="live-dot" />
              <span className="live-badge-text">RIGHT NOW</span>
            </div>
            {locationName && (
              <span className="current-location-tag" title={locationName}>
                {locationName}
              </span>
            )}
          </div>

          <div className="current-header-right">
            {timeFormatted && !error && (
              <span className="current-time-badge" title="Observation timestamp">
                <span className="time-icon">🕒</span>
                <span>as of {timeFormatted}</span>
              </span>
            )}
            <button
              type="button"
              className="current-refresh-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh live conditions"
              aria-label="Refresh live conditions"
            >
              <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>↻</span>
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && !current && (
          <div className="current-loading-state">
            <div className="loading-spinner-sm" />
            <span>Fetching live conditions...</span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="current-error-state">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Main Content: Big Live Temperature, Weather Condition, and Quick Telemetry Chips */}
        {current && !error && (
          <div className="current-body-layout">
            <div className="current-hero-left">
              <div className="current-temp-wrapper">
                <span className="current-temp-value">
                  {current.temperature_c !== null && current.temperature_c !== undefined
                    ? current.temperature_c.toFixed(1)
                    : '--'}
                </span>
                <span className="current-temp-unit">°C</span>
                <span className="current-temp-f">
                  {current.temperature_f !== null && current.temperature_f !== undefined
                    ? ` / ${current.temperature_f.toFixed(1)}°F`
                    : ''}
                </span>
              </div>

              <div className="current-condition-lockup">
                <span className="current-condition-emoji">{condition.icon}</span>
                <span className="current-condition-name">{condition.label}</span>
              </div>
            </div>

            {/* Flat Telemetry Chips */}
            <div className="current-chips-grid">
              {/* Feels Like */}
              <div className="current-chip">
                <span className="chip-ico">🌡️</span>
                <div className="chip-meta">
                  <span className="chip-title">Feels Like</span>
                  <span className="chip-num">
                    {current.feels_like_c !== null && current.feels_like_c !== undefined
                      ? `${current.feels_like_c.toFixed(1)}°C`
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Relative Humidity */}
              <div className="current-chip">
                <span className="chip-ico">💧</span>
                <div className="chip-meta">
                  <span className="chip-title">Humidity</span>
                  <span className="chip-num">
                    {current.humidity_pct !== null && current.humidity_pct !== undefined
                      ? `${Math.round(current.humidity_pct)}%`
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Wind Speed & Direction */}
              <div className="current-chip">
                <span className="chip-ico">💨</span>
                <div className="chip-meta">
                  <span className="chip-title">Wind</span>
                  <span className="chip-num">
                    {current.wind_speed_kmh !== null && current.wind_speed_kmh !== undefined
                      ? `${current.wind_speed_kmh.toFixed(1)} km/h ${cardinal}`
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Precipitation */}
              <div className="current-chip">
                <span className="chip-ico">🌧️</span>
                <div className="chip-meta">
                  <span className="chip-title">Precipitation</span>
                  <span className="chip-num">
                    {current.precipitation_mm !== null && current.precipitation_mm !== undefined
                      ? `${current.precipitation_mm.toFixed(1)} mm`
                      : '0.0 mm'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
