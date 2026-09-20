import React from 'react';

const toFahrenheit = (c) =>
  c !== null && c !== undefined ? ((c * 9) / 5 + 32).toFixed(1) : 'N/A';

export default function StatsPanel({ stats }) {
  if (!stats) return null;

  const {
    start_date,
    end_date,
    num_days,
    avg_temp_c,
    max_temp_c,
    min_temp_c,
    std_temp_c,
    trend_slope_c_per_day,
    trend_direction,
  } = stats;

  const getDirectionBadge = () => {
    switch (trend_direction?.toLowerCase()) {
      case 'warming':
        return {
          label: 'Warming',
          icon: '↗',
          className: 'trend-badge warming',
        };
      case 'cooling':
        return {
          label: 'Cooling',
          icon: '↘',
          className: 'trend-badge cooling',
        };
      default:
        return {
          label: trend_direction || 'Stable',
          icon: '→',
          className: 'trend-badge stable',
        };
    }
  };

  const badge = getDirectionBadge();

  return (
    <div className="card stats-card">
      <div className="stats-header">
        <div>
          <h3>Summary Statistics</h3>
          <p className="stats-range">
            {start_date} to {end_date} &bull; <strong>{num_days}</strong> observed days
          </p>
        </div>
        <div className="trend-summary">
          <span className={badge.className}>
            <span className="trend-icon">{badge.icon}</span> {badge.label}
          </span>
          {trend_slope_c_per_day !== undefined && (
            <span className="trend-slope">
              {trend_slope_c_per_day > 0 ? '+' : ''}
              {trend_slope_c_per_day.toFixed(4)} °C/day
            </span>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-label">Average Temperature</span>
          <div className="stat-value">
            {avg_temp_c !== null ? `${avg_temp_c.toFixed(1)}°C` : 'N/A'}
            <span className="stat-sub">{toFahrenheit(avg_temp_c)}°F</span>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-label">Maximum Recorded</span>
          <div className="stat-value max-temp">
            {max_temp_c !== null ? `${max_temp_c.toFixed(1)}°C` : 'N/A'}
            <span className="stat-sub">{toFahrenheit(max_temp_c)}°F</span>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-label">Minimum Recorded</span>
          <div className="stat-value min-temp">
            {min_temp_c !== null ? `${min_temp_c.toFixed(1)}°C` : 'N/A'}
            <span className="stat-sub">{toFahrenheit(min_temp_c)}°F</span>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-label">Standard Deviation</span>
          <div className="stat-value">
            {std_temp_c !== null ? `±${std_temp_c.toFixed(2)}°C` : 'N/A'}
            <span className="stat-sub">Variation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
