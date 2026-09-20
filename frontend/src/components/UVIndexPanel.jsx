import React from 'react';

const UV_BANDS = [
  { label: 'Low', range: '0-2', min: 0, max: 2.99, color: '#10b981' },
  { label: 'Moderate', range: '3-5', min: 3, max: 5.99, color: '#eab308' },
  { label: 'High', range: '6-7', min: 6, max: 7.99, color: '#f97316' },
  { label: 'Very High', range: '8-10', min: 8, max: 10.99, color: '#ef4444' },
  { label: 'Extreme', range: '11+', min: 11, max: 999, color: '#8b5cf6' },
];

function getUVBand(value) {
  if (value === null || value === undefined || isNaN(value)) return null;
  return UV_BANDS.find((b) => value >= b.min && value <= b.max) || UV_BANDS[UV_BANDS.length - 1];
}

export default function UVIndexPanel({ daily = [] }) {
  if (!daily || daily.length === 0) return null;

  const validReadings = daily
    .map((d) => d.uv_index_max)
    .filter((uv) => uv !== null && uv !== undefined && !isNaN(uv));

  const hasData = validReadings.length > 0;

  const maxUV = hasData ? Math.max(...validReadings) : null;
  const avgUV = hasData
    ? +(validReadings.reduce((sum, uv) => sum + uv, 0) / validReadings.length).toFixed(1)
    : null;

  const currentBand = hasData ? getUVBand(maxUV) : null;

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">☀️</span>
          <span className="card-title">UV Index</span>
        </div>
        {currentBand && (
          <span
            className="card-status-pill"
            style={{ backgroundColor: `${currentBand.color}18`, color: currentBand.color }}
          >
            {currentBand.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="telemetry-empty-notice">
          <span className="notice-icon">ℹ️</span>
          <p>
            UV Index isn't available for historical dates (Open-Meteo's archive doesn't include this field for past dates).
          </p>
        </div>
      ) : (
        <div className="telemetry-body">
          <div className="primary-metric">
            <span className="metric-number">{maxUV.toFixed(1)}</span>
            <span className="metric-subtitle">Peak UV</span>
            {avgUV !== null && (
              <span className="metric-secondary-badge">Avg: {avgUV}</span>
            )}
          </div>

          {/* Flat 5-block color scale */}
          <div className="uv-scale-container">
            <div className="uv-blocks-grid">
              {UV_BANDS.map((band) => {
                const isActive = currentBand?.label === band.label;
                return (
                  <div
                    key={band.label}
                    className={`uv-scale-block ${isActive ? 'active-block' : ''}`}
                    style={{
                      backgroundColor: isActive ? band.color : `${band.color}25`,
                      color: isActive ? '#ffffff' : band.color,
                      borderColor: band.color,
                    }}
                  >
                    <span className="block-label">{band.label}</span>
                    <span className="block-range">{band.range}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
