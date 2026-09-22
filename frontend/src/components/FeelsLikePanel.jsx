import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

function getDewpointComfort(dew) {
  if (dew === null || dew === undefined || isNaN(dew)) return null;
  if (dew < 10) return { label: 'Very Dry', color: '#0284c7' };
  if (dew <= 15) return { label: 'Comfortable', color: '#10b981' };
  if (dew <= 20) return { label: 'Humid', color: '#f59e0b' };
  if (dew <= 24) return { label: 'Very Muggy', color: '#f97316' };
  return { label: 'Oppressive', color: '#ef4444' };
}

export default function FeelsLikePanel({ daily = [], stats = null, live = null }) {
  const validFeels = Array.isArray(daily)
    ? daily
        .map((d) => d.feels_like_c)
        .filter((f) => f !== null && f !== undefined && !isNaN(f))
    : [];

  const validDew = Array.isArray(daily)
    ? daily
        .map((d) => d.dewpoint_c)
        .filter((d) => d !== null && d !== undefined && !isNaN(d))
    : [];

  const hasFeelsData = validFeels.length > 0;

  const rawFeelsLike = hasFeelsData
    ? +(validFeels.reduce((a, b) => a + b, 0) / validFeels.length).toFixed(1)
    : null;

  const rawActual = stats?.avg_temp_c ?? (
    Array.isArray(daily) && daily.length > 0
      ? +(daily.reduce((sum, d) => sum + (d.temp_mean_c ?? 0), 0) / daily.length).toFixed(1)
      : null
  );

  const rawDewpoint = validDew.length > 0
    ? +(validDew.reduce((a, b) => a + b, 0) / validDew.length).toFixed(1)
    : null;

  const animatedFeels = useCountUp(rawFeelsLike, 800, 1);
  const animatedActual = useCountUp(rawActual, 800, 1);
  const animatedDew = useCountUp(rawDewpoint, 800, 1);

  if (!daily || daily.length === 0) return null;

  const dewComfort = getDewpointComfort(rawDewpoint);

  // Compute thermal gap
  let gapNote = '';
  if (rawFeelsLike !== null && rawActual !== null) {
    const diff = +(rawFeelsLike - rawActual).toFixed(1);
    if (Math.abs(diff) < 0.3) {
      gapNote = 'Feels virtually identical to actual temperature on average.';
    } else if (diff > 0) {
      gapNote = `Feels ~${diff}°C warmer on average due to atmospheric moisture.`;
    } else {
      gapNote = `Feels ~${Math.abs(diff)}°C cooler on average due to airflow.`;
    }
  }

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">🌡️</span>
          <span className="card-title">Feels-Like & Dewpoint</span>
        </div>
        {dewComfort && (
          <span
            className="card-status-pill"
            style={{ backgroundColor: `${dewComfort.color}18`, color: dewComfort.color }}
          >
            {dewComfort.label}
          </span>
        )}
      </div>

      {!hasFeelsData ? (
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="telemetry-empty-notice">
              <p>Apparent temperature data unavailable for this date range.</p>
            </div>
          </div>
          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              <span className="sub-stat-item">Dewpoint data unavailable</span>
            </div>
            {live && live.feels_like_c !== undefined && live.feels_like_c !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{live.feels_like_c.toFixed(1)}°C</span>
                {live.dewpoint_c !== null && live.dewpoint_c !== undefined && (
                  <span className="live-strip-sub">
                    • Dewpoint: {live.dewpoint_c.toFixed(1)}°C
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
            <div className="feels-like-comparison-row">
              <div className="primary-metric">
                <span className="metric-number">{animatedFeels}</span>
                <span className="metric-unit">°C</span>
                <span className="metric-subtitle">Apparent</span>
              </div>

              <div className="actual-temp-comparison">
                <span className="actual-temp-label">Actual Mean</span>
                <span className="actual-temp-val">{animatedActual !== null ? `${animatedActual}°C` : '--'}</span>
              </div>
            </div>

            {gapNote && (
              <div className="feels-like-note">
                <span className="note-bullet">💡</span> {gapNote}
              </div>
            )}
          </div>

          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              {rawDewpoint !== null ? (
                <>
                  <span className="sub-stat-item">
                    <span className="sub-stat-label">Avg Dewpoint:</span> {animatedDew}°C
                  </span>
                  <span className="sub-stat-divider">•</span>
                  <span className="sub-stat-item">
                    <span className="sub-stat-label">Comfort:</span> {dewComfort?.label ?? '--'}
                  </span>
                </>
              ) : (
                <span className="sub-stat-item">Dewpoint unavailable for range</span>
              )}
            </div>

            {live && live.feels_like_c !== undefined && live.feels_like_c !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{live.feels_like_c.toFixed(1)}°C</span>
                {live.dewpoint_c !== null && live.dewpoint_c !== undefined && (
                  <span className="live-strip-sub">
                    • Dewpoint: {live.dewpoint_c.toFixed(1)}°C
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
