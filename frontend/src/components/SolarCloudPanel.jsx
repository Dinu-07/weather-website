import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

function getSunshineLevel(solarSum) {
  if (solarSum === null || solarSum === undefined || isNaN(solarSum)) return null;
  if (solarSum >= 20) return { label: 'High Sunshine', color: '#eab308' };
  if (solarSum >= 14) return { label: 'Moderate Sun', color: '#f59e0b' };
  if (solarSum >= 8) return { label: 'Filtered Sun', color: '#0284c7' };
  return { label: 'Low Sunshine', color: '#64748b' };
}

export default function SolarCloudPanel({ daily = [], stats = null, live = null }) {
  const isArr = Array.isArray(daily);
  const validClouds = isArr
    ? daily
        .map((d) => d.cloudcover_pct)
        .filter((c) => c !== null && c !== undefined && !isNaN(c))
    : [];

  const validSolar = isArr
    ? daily
        .map((d) => d.solar_radiation_sum)
        .filter((s) => s !== null && s !== undefined && !isNaN(s))
    : [];

  const hasData = validClouds.length > 0 || validSolar.length > 0;

  const rawAvgCloud = stats?.avg_cloud_cover ?? (
    validClouds.length > 0
      ? Math.round(validClouds.reduce((a, b) => a + b, 0) / validClouds.length)
      : null
  );

  const rawAvgSolar = stats?.avg_solar_radiation ?? (
    validSolar.length > 0
      ? +(validSolar.reduce((a, b) => a + b, 0) / validSolar.length).toFixed(1)
      : null
  );

  const animatedCloud = useCountUp(rawAvgCloud, 800, 0);
  const animatedSolar = useCountUp(rawAvgSolar, 800, 1);

  if (!daily || daily.length === 0) return null;

  const sunshine = getSunshineLevel(rawAvgSolar);

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">⛅</span>
          <span className="card-title">Cloud & Solar</span>
        </div>
        {sunshine && (
          <span
            className="card-status-pill"
            style={{ backgroundColor: `${sunshine.color}18`, color: sunshine.color }}
          >
            {sunshine.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="telemetry-empty-notice">
              <p>Cloud cover and solar data unavailable for this range.</p>
            </div>
          </div>
          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              <span className="sub-stat-item">Historical solar data unavailable</span>
            </div>
            {live && live.cloud_cover_pct !== undefined && live.cloud_cover_pct !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{Math.round(live.cloud_cover_pct)}%</span>
                <span className="live-strip-sub">
                  • {live.cloud_cover_pct <= 20 ? 'Clear Sky' : live.cloud_cover_pct <= 60 ? 'Partly Cloudy' : 'Overcast'}
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
              <span className="metric-number">{animatedCloud !== null ? animatedCloud : '--'}</span>
              <span className="metric-unit">%</span>
              <span className="metric-subtitle">Avg Cloud Cover</span>
            </div>

            <div className="progress-bar-wrapper">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill animated-fill"
                  style={{
                    width: `${Math.min(Math.max(rawAvgCloud || 0, 0), 100)}%`,
                    backgroundColor: '#0284c7',
                  }}
                />
              </div>
              <div className="progress-bar-labels">
                <span>0% Clear</span>
                <span>50%</span>
                <span>100% Overcast</span>
              </div>
            </div>
          </div>

          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              {rawAvgSolar !== null ? (
                <>
                  <span className="sub-stat-item">
                    <span className="sub-stat-label">Irradiance:</span> {animatedSolar} MJ/m²
                  </span>
                  <span className="sub-stat-divider">•</span>
                  <span className="sub-stat-item">
                    <span className="sub-stat-label">Level:</span> {sunshine?.label ?? '--'}
                  </span>
                </>
              ) : (
                <span className="sub-stat-item">Solar data unavailable</span>
              )}
            </div>

            {live && live.cloud_cover_pct !== undefined && live.cloud_cover_pct !== null ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                <span className="live-strip-val">{Math.round(live.cloud_cover_pct)}%</span>
                <span className="live-strip-sub">
                  • {live.cloud_cover_pct <= 20 ? 'Clear Sky' : live.cloud_cover_pct <= 60 ? 'Partly Cloudy' : 'Overcast'}
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
