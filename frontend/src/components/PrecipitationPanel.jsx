import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

export default function PrecipitationPanel({ daily = [], stats = null, live = null }) {
  const isArr = Array.isArray(daily);
  const totalDays = stats?.num_days ?? (isArr ? daily.length : 0);
  const rawWetDays = stats?.total_wet_days ?? (isArr ? daily.filter((d) => (d.precipitation_mm ?? 0) > 0.1).length : 0);

  const rawTotalHours = stats?.total_precipitation_hours ?? (() => {
    if (!isArr) return null;
    const valid = daily.map((d) => d.precipitation_hours).filter((h) => h !== null && !isNaN(h));
    return valid.length > 0 ? +(valid.reduce((a, b) => a + b, 0)).toFixed(1) : null;
  })();

  const rawTotalPrecipMm = isArr
    ? +(daily.reduce((sum, d) => sum + (d.precipitation_mm ?? 0), 0)).toFixed(1)
    : 0;

  // Precipitation probability (present for forecast-overlapping dates)
  const validProbabilities = isArr
    ? daily
        .map((d) => d.precipitation_probability)
        .filter((p) => p !== null && p !== undefined && !isNaN(p))
    : [];

  const rawAvgProbability = validProbabilities.length > 0
    ? Math.round(validProbabilities.reduce((a, b) => a + b, 0) / validProbabilities.length)
    : null;

  const animatedWetDays = useCountUp(rawWetDays, 800, 0);
  const animatedPrecipMm = useCountUp(rawTotalPrecipMm, 800, 1);
  const animatedHours = useCountUp(rawTotalHours, 800, 1);
  const animatedProbability = useCountUp(rawAvgProbability, 800, 0);

  if (!daily || daily.length === 0) return null;

  const wetPct = totalDays > 0 ? Math.round((rawWetDays / totalDays) * 100) : 0;

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">🌧️</span>
          <span className="card-title">Precipitation</span>
        </div>
        <span className="card-status-pill precip-pill">
          {wetPct}% rainy days
        </span>
      </div>

      <div className="telemetry-body">
        <div className="telemetry-main-content">
          <div className="precip-headline">
            <span className="precip-highlight">{animatedWetDays} of {totalDays} days</span> had rain
          </div>

          <div className="precip-stats-row">
            <div className="precip-mini-stat">
              <span className="mini-stat-val">{animatedPrecipMm} <span className="mini-stat-unit">mm</span></span>
              <span className="mini-stat-label">Total Volume</span>
            </div>

            {rawTotalHours !== null && (
              <div className="precip-mini-stat">
                <span className="mini-stat-val">{animatedHours} <span className="mini-stat-unit">hrs</span></span>
                <span className="mini-stat-label">Rain Duration</span>
              </div>
            )}

            {rawAvgProbability !== null && (
              <div className="precip-mini-stat">
                <span className="mini-stat-val">{animatedProbability} <span className="mini-stat-unit">%</span></span>
                <span className="mini-stat-label">Avg Probability</span>
              </div>
            )}
          </div>
        </div>

        <div className="telemetry-bottom-group">
          <div className="telemetry-sub-stats">
            {rawAvgProbability !== null ? (
              <span className="sub-stat-item">
                <span className="sub-stat-label">Avg Probability:</span> {animatedProbability}%
              </span>
            ) : (
              <span className="sub-stat-item">Rain probability tracked for recent dates</span>
            )}
          </div>

          {live && live.precipitation !== undefined && live.precipitation !== null ? (
            <div className="telemetry-live-strip">
              <span className="live-pulse-dot" />
              <span className="live-strip-label">Live Now:</span>
              <span className="live-strip-val">{Number(live.precipitation).toFixed(1)} mm</span>
              <span className="live-strip-sub">• precipitation</span>
            </div>
          ) : (
            <div className="telemetry-live-slot-placeholder" />
          )}
        </div>
      </div>
    </div>
  );
}
