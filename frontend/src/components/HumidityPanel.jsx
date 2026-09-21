import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

export default function HumidityPanel({ daily = [], live = null }) {
  const isArr = Array.isArray(daily);
  const validReadings = isArr
    ? daily
        .map((d) => d.humidity_pct)
        .filter((h) => h !== null && h !== undefined && !isNaN(h))
    : [];

  const hasData = validReadings.length > 0;

  const rawAvgHumidity = hasData
    ? Math.round(validReadings.reduce((sum, h) => sum + h, 0) / validReadings.length)
    : null;

  const animatedAvg = useCountUp(rawAvgHumidity, 800, 0);

  if (!daily || daily.length === 0) return null;

  const minHumidity = hasData ? Math.round(Math.min(...validReadings)) : null;
  const maxHumidity = hasData ? Math.round(Math.max(...validReadings)) : null;

  const getComfortLevel = (pct) => {
    if (pct < 30) return { label: 'Dry', color: '#eab308', tip: 'Low moisture levels' };
    if (pct <= 60) return { label: 'Comfortable', color: '#10b981', tip: 'Optimal indoor/outdoor humidity' };
    if (pct <= 75) return { label: 'Moderate Humid', color: '#0284c7', tip: 'Noticeable moisture in air' };
    return { label: 'Very Humid', color: '#8b5cf6', tip: 'Sticky, high moisture atmosphere' };
  };

  const comfort = rawAvgHumidity !== null ? getComfortLevel(rawAvgHumidity) : null;

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">💧</span>
          <span className="card-title">Relative Humidity</span>
        </div>
        {comfort && (
          <span
            className="card-status-pill"
            style={{ backgroundColor: `${comfort.color}18`, color: comfort.color }}
          >
            {comfort.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="telemetry-empty-notice">
              <p>Humidity data is not available for this date range.</p>
            </div>
          </div>
          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              <span className="sub-stat-item">Historical humidity unavailable</span>
            </div>
            {live && live.humidity_pct !== undefined && live.humidity_pct !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{Math.round(live.humidity_pct)}%</span>
                <span className="live-strip-sub">
                  • {getComfortLevel(live.humidity_pct)?.label ?? 'Comfortable'}
                </span>
              </div>
            ) : (
              <div className="telemetry-live-slot-placeholder" />
            )}
          </div>
        </div>
      ) : (
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="primary-metric">
              <span className="metric-number">{animatedAvg}</span>
              <span className="metric-unit">%</span>
              <span className="metric-subtitle">Average</span>
            </div>

            <div className="progress-bar-wrapper">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill animated-fill"
                  style={{
                    width: `${Math.min(Math.max(rawAvgHumidity, 0), 100)}%`,
                    backgroundColor: comfort.color,
                  }}
                />
              </div>
              <div className="progress-bar-labels">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              {minHumidity !== null && maxHumidity !== null ? (
                <>
                  <span className="sub-stat-item">
                    <span className="sub-stat-label">Min:</span> {minHumidity}%
                  </span>
                  <span className="sub-stat-divider">•</span>
                  <span className="sub-stat-item">
                    <span className="sub-stat-label">Max:</span> {maxHumidity}%
                  </span>
                </>
              ) : (
                <span className="sub-stat-item">Range humidity unavailable</span>
              )}
            </div>

            {live && live.humidity_pct !== undefined && live.humidity_pct !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{Math.round(live.humidity_pct)}%</span>
                <span className="live-strip-sub">
                  • {getComfortLevel(live.humidity_pct)?.label ?? 'Comfortable'}
                </span>
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
