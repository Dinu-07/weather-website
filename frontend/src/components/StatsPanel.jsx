import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

export default function StatsPanel({ stats }) {
  const animatedAvg = useCountUp(stats?.avg_temp_c, 800, 1);
  const animatedMax = useCountUp(stats?.max_temp_c, 800, 1);
  const animatedMin = useCountUp(stats?.min_temp_c, 800, 1);
  const animatedStd = useCountUp(stats?.std_temp_c, 800, 1);

  if (!stats) return null;

  const {
    start_date,
    end_date,
    num_days,
    trend_slope_c_per_day,
    trend_direction,
  } = stats;

  const toFahrenheit = (c) =>
    c !== null && c !== undefined && !isNaN(c)
      ? `${((Number(c) * 9) / 5 + 32).toFixed(1)}°F`
      : '--';

  const isWarming = trend_direction?.toLowerCase() === 'warming';
  const isCooling = trend_direction?.toLowerCase() === 'cooling';

  const trendIcon = isWarming ? '↗' : isCooling ? '↘' : '→';
  const trendColor = isWarming ? '#ef4444' : isCooling ? '#0284c7' : '#10b981';
  const trendBg = isWarming ? 'rgba(239, 68, 68, 0.12)' : isCooling ? 'rgba(2, 132, 199, 0.12)' : 'rgba(16, 185, 129, 0.12)';

  return (
    <div className="summary-stats-section">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Temperature & Trend Analysis</h3>
          <p className="section-subtitle">
            {start_date} to {end_date} • {num_days} days observed
          </p>
        </div>

        {trend_direction && (
          <div
            className="trend-pill"
            style={{ backgroundColor: trendBg, color: trendColor }}
          >
            <span className="trend-arrow">{trendIcon}</span>
            <span className="trend-name">
              {trend_direction.charAt(0).toUpperCase() + trend_direction.slice(1)}
            </span>
            {trend_slope_c_per_day !== undefined && (
              <span className="trend-val">
                ({trend_slope_c_per_day > 0 ? '+' : ''}
                {trend_slope_c_per_day.toFixed(3)}°C/day)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="stats-cards-grid">
        <div className="stat-card">
          <div className="stat-card-label">
            <span className="stat-dot dot-mean" />
            Mean Temperature
          </div>
          <div className="stat-card-main-val">
            {animatedAvg !== null ? animatedAvg : '--'}
            <span className="stat-card-unit">°C</span>
          </div>
          <div className="stat-card-secondary-val">
            {toFahrenheit(animatedAvg)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <span className="stat-dot dot-high" />
            Peak High
          </div>
          <div className="stat-card-main-val">
            {animatedMax !== null ? animatedMax : '--'}
            <span className="stat-card-unit">°C</span>
          </div>
          <div className="stat-card-secondary-val">
            {toFahrenheit(animatedMax)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <span className="stat-dot dot-low" />
            Trough Low
          </div>
          <div className="stat-card-main-val">
            {animatedMin !== null ? animatedMin : '--'}
            <span className="stat-card-unit">°C</span>
          </div>
          <div className="stat-card-secondary-val">
            {toFahrenheit(animatedMin)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <span className="stat-dot dot-std" />
            Std Deviation
          </div>
          <div className="stat-card-main-val">
            {animatedStd !== null ? `±${animatedStd}` : '--'}
            <span className="stat-card-unit">°C</span>
          </div>
          <div className="stat-card-secondary-val">
            Variance across period
          </div>
        </div>
      </div>
    </div>
  );
}
