import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

function getCardinalDirection(deg) {
  if (deg === null || deg === undefined || isNaN(deg)) return '--';
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

export default function WindPanel({ daily = [], stats = null, live = null }) {
  const isArr = Array.isArray(daily);
  const validWinds = isArr
    ? daily
        .map((d) => d.wind_speed_max ?? d.windspeed_max_kmh)
        .filter((w) => w !== null && w !== undefined && !isNaN(w))
    : [];

  const validGusts = isArr
    ? daily
        .map((d) => d.wind_gusts_max)
        .filter((g) => g !== null && g !== undefined && !isNaN(g))
    : [];

  const validDirections = isArr
    ? daily
        .map((d) => d.wind_direction_dominant)
        .filter((dir) => dir !== null && dir !== undefined && !isNaN(dir))
    : [];

  const hasData = validWinds.length > 0;

  const rawAvgWind = stats?.avg_wind_speed ?? (
    hasData ? +(validWinds.reduce((a, b) => a + b, 0) / validWinds.length).toFixed(1) : null
  );

  const rawAvgGusts = validGusts.length > 0
    ? +(validGusts.reduce((a, b) => a + b, 0) / validGusts.length).toFixed(1)
    : null;

  const animatedWind = useCountUp(rawAvgWind, 800, 1);
  const animatedGusts = useCountUp(rawAvgGusts, 800, 1);

  if (!daily || daily.length === 0) return null;

  const avgDirection = validDirections.length > 0
    ? Math.round(validDirections.reduce((a, b) => a + b, 0) / validDirections.length)
    : null;

  const cardinal = getCardinalDirection(avgDirection);

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">💨</span>
          <span className="card-title">Wind & Gusts</span>
        </div>
        {cardinal !== '--' && (
          <span className="card-status-pill wind-cardinal-pill">
            {cardinal} ({avgDirection}°)
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="telemetry-empty-notice">
              <p>Wind data is not available for this period.</p>
            </div>
          </div>
          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              <span className="sub-stat-item">Historical wind unavailable</span>
            </div>
            {live && live.wind_speed_kmh !== undefined && live.wind_speed_kmh !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{live.wind_speed_kmh.toFixed(1)} km/h</span>
                {live.wind_direction !== null && live.wind_direction !== undefined && (
                  <span className="live-strip-sub">
                    • {getCardinalDirection(live.wind_direction)}
                  </span>
                )}
                {live.wind_gusts_kmh !== null && live.wind_gusts_kmh !== undefined && (
                  <span className="live-strip-sub">
                    • Gusts: {live.wind_gusts_kmh.toFixed(1)} km/h
                  </span>
                )}
              </div>
            ) : (
              <div className="telemetry-live-slot-placeholder" />
            )}
          </div>
        </div>
      ) : (
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="wind-metrics-layout">
              <div className="primary-metric">
                <span className="metric-number">{animatedWind !== null ? animatedWind : '--'}</span>
                <span className="metric-unit">km/h</span>
                <span className="metric-subtitle">Avg Max</span>
              </div>

              {/* Compass Rose Indicator */}
              <div className="compass-widget" title={`Dominant direction: ${cardinal} (${avgDirection}°)`}>
                <div className="compass-dial">
                  <span className="compass-n">N</span>
                  <span className="compass-e">E</span>
                  <span className="compass-s">S</span>
                  <span className="compass-w">W</span>
                  <div
                    className="compass-arrow-pivot"
                    style={{ transform: `rotate(${avgDirection || 0}deg)` }}
                  >
                    <div className="compass-pointer" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              {rawAvgGusts !== null || avgDirection !== null ? (
                <>
                  {rawAvgGusts !== null && (
                    <span className="sub-stat-item">
                      <span className="sub-stat-label">Avg Gusts:</span> {animatedGusts} km/h
                    </span>
                  )}
                  {rawAvgGusts !== null && avgDirection !== null && (
                    <span className="sub-stat-divider">•</span>
                  )}
                  {avgDirection !== null && (
                    <span className="sub-stat-item">
                      <span className="sub-stat-label">Direction:</span> {cardinal}
                    </span>
                  )}
                </>
              ) : (
                <span className="sub-stat-item">Wind stats unavailable</span>
              )}
            </div>

            {live && live.wind_speed_kmh !== undefined && live.wind_speed_kmh !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{live.wind_speed_kmh.toFixed(1)} km/h</span>
                {live.wind_direction !== null && live.wind_direction !== undefined && (
                  <span className="live-strip-sub">
                    • {getCardinalDirection(live.wind_direction)}
                  </span>
                )}
                {live.wind_gusts_kmh !== null && live.wind_gusts_kmh !== undefined && (
                  <span className="live-strip-sub">
                    • Gusts: {live.wind_gusts_kmh.toFixed(1)} km/h
                  </span>
                )}
              </div>
            ) : (
              <div className="telemetry-live-slot-placeholder" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
