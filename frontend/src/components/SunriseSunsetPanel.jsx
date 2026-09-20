import React from 'react';

// Helper to convert ISO string (e.g. "2026-09-01T05:47") or Date to minutes from midnight
function parseTimeToMinutes(isoStr) {
  if (!isoStr) return null;
  const timePart = isoStr.includes('T') ? isoStr.split('T')[1] : isoStr;
  const [hours, minutes] = timePart.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

// Helper to format minutes from midnight to "HH:MM AM/PM"
function formatMinutesToTime(totalMinutes) {
  if (totalMinutes === null || isNaN(totalMinutes)) return '--:--';
  const mins = Math.round(totalMinutes);
  let h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const formattedMinutes = m < 10 ? `0${m}` : m;
  return `${h}:${formattedMinutes} ${ampm}`;
}

export default function SunriseSunsetPanel({ daily = [] }) {
  if (!daily || daily.length === 0) return null;

  const validSunrises = daily
    .map((d) => parseTimeToMinutes(d.sunrise))
    .filter((m) => m !== null);

  const validSunsets = daily
    .map((d) => parseTimeToMinutes(d.sunset))
    .filter((m) => m !== null);

  const hasData = validSunrises.length > 0 && validSunsets.length > 0;

  let avgSunriseTime = '--:--';
  let avgSunsetTime = '--:--';
  let daylightHours = null;

  if (hasData) {
    const avgSunriseMins =
      validSunrises.reduce((sum, m) => sum + m, 0) / validSunrises.length;
    const avgSunsetMins =
      validSunsets.reduce((sum, m) => sum + m, 0) / validSunsets.length;

    avgSunriseTime = formatMinutesToTime(avgSunriseMins);
    avgSunsetTime = formatMinutesToTime(avgSunsetMins);

    const diffMins = Math.max(0, avgSunsetMins - avgSunriseMins);
    const dHours = Math.floor(diffMins / 60);
    const dMins = Math.round(diffMins % 60);
    daylightHours = `${dHours}h ${dMins}m`;
  }

  return (
    <div className="telemetry-card">
      <div className="card-top-row">
        <div className="card-icon-title">
          <span className="card-icon">☀️</span>
          <span className="card-title">Sun & Daylight</span>
        </div>
        {daylightHours && (
          <span className="card-status-pill daylight-pill">
            {daylightHours} daylight
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="telemetry-empty-notice">
          <p>Sunrise & sunset records are unavailable for this range.</p>
        </div>
      ) : (
        <div className="sun-times-grid">
          <div className="sun-time-card">
            <div className="sun-time-header">
              <span className="sun-time-icon">🌅</span>
              <span className="sun-time-label">Average Sunrise</span>
            </div>
            <div className="sun-time-value">{avgSunriseTime}</div>
          </div>

          <div className="sun-time-card">
            <div className="sun-time-header">
              <span className="sun-time-icon">🌇</span>
              <span className="sun-time-label">Average Sunset</span>
            </div>
            <div className="sun-time-value">{avgSunsetTime}</div>
          </div>
        </div>
      )}
    </div>
  );
}
