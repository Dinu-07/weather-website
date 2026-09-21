import React, { useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

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

export default function AirQualityPanel({ daily = [], live = null }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isArr = Array.isArray(daily);
  const validUSAQI = isArr
    ? daily
        .map((d) => d.us_aqi)
        .filter((v) => v !== null && v !== undefined && !isNaN(v))
    : [];

  const validEUAQI = isArr
    ? daily
        .map((d) => d.european_aqi)
        .filter((v) => v !== null && v !== undefined && !isNaN(v))
    : [];

  const validPM25 = isArr
    ? daily
        .map((d) => d.pm2_5)
        .filter((v) => v !== null && v !== undefined && !isNaN(v))
    : [];

  const validPM10 = isArr
    ? daily
        .map((d) => d.pm10)
        .filter((v) => v !== null && v !== undefined && !isNaN(v))
    : [];

  const hasData = validUSAQI.length > 0 || validEUAQI.length > 0;

  const rawUSAQI = validUSAQI.length > 0
    ? Math.round(validUSAQI.reduce((sum, v) => sum + v, 0) / validUSAQI.length)
    : null;

  const rawEUAQI = validEUAQI.length > 0
    ? Math.round(validEUAQI.reduce((sum, v) => sum + v, 0) / validEUAQI.length)
    : null;

  const rawPM25 = validPM25.length > 0
    ? +(validPM25.reduce((sum, v) => sum + v, 0) / validPM25.length).toFixed(1)
    : null;

  const rawPM10 = validPM10.length > 0
    ? +(validPM10.reduce((sum, v) => sum + v, 0) / validPM10.length).toFixed(1)
    : null;

  const animatedUSAQI = useCountUp(rawUSAQI, 800, 0);
  const animatedEUAQI = useCountUp(rawEUAQI, 800, 0);

  if (!daily || daily.length === 0) return null;

  const usBand = getUSAQIBand(rawUSAQI);
  const euBand = getEuropeanAQIBand(rawEUAQI);

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">🍃</span>
          <span className="card-title">Air Quality</span>
          <div className="aqi-info-tooltip-wrap">
            <button
              type="button"
              className="aqi-info-btn"
              onClick={() => setShowTooltip((prev) => !prev)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              aria-label="Air quality data source information"
              title="Based on Open-Meteo's regional atmospheric model (CAMS reanalysis) — readings may differ from hyperlocal ground-sensor apps."
            >
              <svg className="aqi-info-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            {showTooltip && (
              <div className="aqi-info-popover" role="tooltip">
                Based on Open-Meteo&apos;s regional atmospheric model (CAMS reanalysis) — readings may differ from hyperlocal ground-sensor apps.
              </div>
            )}
          </div>
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
        <div className="telemetry-body">
          <div className="telemetry-main-content">
            <div className="telemetry-empty-notice">
              <span className="notice-icon">ℹ️</span>
              <p>Air quality data not available for this historical period.</p>
              <span className="notice-sub">Open-Meteo provides atmospheric AQI coverage for recent years.</span>
            </div>
          </div>
          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats">
              <span className="sub-stat-item">Historical AQI archive unavailable</span>
            </div>
            {live?.air_quality && (live.air_quality.us_aqi !== undefined || live.air_quality.european_aqi !== undefined) ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                {live.air_quality.us_aqi !== null && live.air_quality.us_aqi !== undefined && (
                  <span className="live-strip-val">US AQI {live.air_quality.us_aqi}</span>
                )}
                {live.air_quality.us_aqi !== null && (
                  <span className="live-strip-sub">({getUSAQIBand(live.air_quality.us_aqi)?.label})</span>
                )}
                {live.air_quality.european_aqi !== null && live.air_quality.european_aqi !== undefined && (
                  <span className="live-strip-sub">• EU: {live.air_quality.european_aqi}</span>
                )}
                {live.air_quality.pm2_5 !== null && live.air_quality.pm2_5 !== undefined && (
                  <span className="live-strip-sub">• PM2.5: {live.air_quality.pm2_5} µg/m³</span>
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
            <div className="aqi-badges-row">
              {rawUSAQI !== null && usBand && (
                <div className="aqi-badge-item">
                  <span className="aqi-badge-label">US AQI</span>
                  <span
                    className="aqi-badge-pill"
                    style={{ backgroundColor: usBand.color }}
                  >
                    {animatedUSAQI} • {usBand.label}
                  </span>
                </div>
              )}

              {rawEUAQI !== null && euBand && (
                <div className="aqi-badge-item">
                  <span className="aqi-badge-label">European AQI</span>
                  <span
                    className="aqi-badge-pill"
                    style={{ backgroundColor: euBand.color }}
                  >
                    {animatedEUAQI} • {euBand.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="telemetry-bottom-group">
            <div className="telemetry-sub-stats aqi-particulates">
              {rawPM25 !== null && (
                <span className="sub-stat-item">
                  <span className="sub-stat-label">PM2.5:</span> {rawPM25} µg/m³
                </span>
              )}
              {rawPM25 !== null && rawPM10 !== null && (
                <span className="sub-stat-divider">•</span>
              )}
              {rawPM10 !== null && (
                <span className="sub-stat-item">
                  <span className="sub-stat-label">PM10:</span> {rawPM10} µg/m³
                </span>
              )}
              {rawPM25 === null && rawPM10 === null && (
                <span className="sub-stat-item">Particulates unavailable for range</span>
              )}
            </div>

            {live?.air_quality && (live.air_quality.us_aqi !== undefined || live.air_quality.european_aqi !== undefined) ? (
              <div className="telemetry-live-strip">
                <span className="live-pulse-dot" />
                <span className="live-strip-label">Live Now:</span>
                {live.air_quality.us_aqi !== null && live.air_quality.us_aqi !== undefined && (
                  <span className="live-strip-val">US AQI {live.air_quality.us_aqi}</span>
                )}
                {live.air_quality.us_aqi !== null && (
                  <span className="live-strip-sub">({getUSAQIBand(live.air_quality.us_aqi)?.label})</span>
                )}
                {live.air_quality.european_aqi !== null && live.air_quality.european_aqi !== undefined && (
                  <span className="live-strip-sub">• EU: {live.air_quality.european_aqi}</span>
                )}
                {live.air_quality.pm2_5 !== null && live.air_quality.pm2_5 !== undefined && (
                  <span className="live-strip-sub">• PM2.5: {live.air_quality.pm2_5} µg/m³</span>
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
