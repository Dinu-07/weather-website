import React from 'react';

// Get band info for US AQI
function getUSAQIBand(aqi) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return null;
  if (aqi <= 50) return { label: 'Good', color: '#10b981' };
  if (aqi <= 100) return { label: 'Moderate', color: '#eab308' };
  if (aqi <= 150) return { label: 'Sensitive', color: '#f97316' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#ef4444' };
  return { label: 'Very Unhealthy', color: '#8b5cf6' };
}

// Get band info for European AQI
function getEuropeanAQIBand(aqi) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return null;
  if (aqi <= 20) return { label: 'Good', color: '#10b981' };
  if (aqi <= 40) return { label: 'Fair', color: '#eab308' };
  if (aqi <= 60) return { label: 'Moderate', color: '#f97316' };
  if (aqi <= 80) return { label: 'Poor', color: '#ef4444' };
  return { label: 'Very Poor', color: '#8b5cf6' };
}

export default function AirQualityPanel({ daily = [] }) {
  if (!daily || daily.length === 0) return null;

  const validUSAQI = daily
    .map((d) => d.us_aqi)
    .filter((v) => v !== null && v !== undefined && !isNaN(v));

  const validEUAQI = daily
    .map((d) => d.european_aqi)
    .filter((v) => v !== null && v !== undefined && !isNaN(v));

  const validPM25 = daily
    .map((d) => d.pm2_5)
    .filter((v) => v !== null && v !== undefined && !isNaN(v));

  const validPM10 = daily
    .map((d) => d.pm10)
    .filter((v) => v !== null && v !== undefined && !isNaN(v));

  const hasData = validUSAQI.length > 0 || validEUAQI.length > 0;

  const avgUSAQI = validUSAQI.length > 0
    ? Math.round(validUSAQI.reduce((sum, v) => sum + v, 0) / validUSAQI.length)
    : null;

  const avgEUAQI = validEUAQI.length > 0
    ? Math.round(validEUAQI.reduce((sum, v) => sum + v, 0) / validEUAQI.length)
    : null;

  const avgPM25 = validPM25.length > 0
    ? +(validPM25.reduce((sum, v) => sum + v, 0) / validPM25.length).toFixed(1)
    : null;

  const avgPM10 = validPM10.length > 0
    ? +(validPM10.reduce((sum, v) => sum + v, 0) / validPM10.length).toFixed(1)
    : null;

  const usBand = getUSAQIBand(avgUSAQI);
  const euBand = getEuropeanAQIBand(avgEUAQI);

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">🍃</span>
          <span className="card-title">Air Quality</span>
        </div>
        {usBand && (
          <span
            className="card-status-pill"
            style={{ backgroundColor: `${usBand.color}18`, color: usBand.color }}
          >
            {usBand.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="telemetry-empty-notice">
          <span className="notice-icon">ℹ️</span>
          <p>Air quality data not available for this historical period.</p>
          <span className="notice-sub">Open-Meteo provides atmospheric AQI coverage for recent years.</span>
        </div>
      ) : (
        <div className="telemetry-body">
          <div className="aqi-badges-row">
            {avgUSAQI !== null && usBand && (
              <div className="aqi-badge-item">
                <span className="aqi-badge-label">US AQI</span>
                <span
                  className="aqi-badge-pill"
                  style={{ backgroundColor: usBand.color }}
                >
                  {avgUSAQI} • {usBand.label}
                </span>
              </div>
            )}

            {avgEUAQI !== null && euBand && (
              <div className="aqi-badge-item">
                <span className="aqi-badge-label">European AQI</span>
                <span
                  className="aqi-badge-pill"
                  style={{ backgroundColor: euBand.color }}
                >
                  {avgEUAQI} • {euBand.label}
                </span>
              </div>
            )}
          </div>

          {(avgPM25 !== null || avgPM10 !== null) && (
            <div className="telemetry-sub-stats aqi-particulates">
              {avgPM25 !== null && (
                <span className="sub-stat-item">
                  <span className="sub-stat-label">PM2.5:</span> {avgPM25} µg/m³
                </span>
              )}
              {avgPM25 !== null && avgPM10 !== null && (
                <span className="sub-stat-divider">•</span>
              )}
              {avgPM10 !== null && (
                <span className="sub-stat-item">
                  <span className="sub-stat-label">PM10:</span> {avgPM10} µg/m³
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
