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

export default function SunriseSunsetPanel({ daily = [], live = null }) {
  const hasLiveSun = Boolean(live?.sunrise_today && live?.sunset_today);
  const todaySunriseMins = hasLiveSun ? parseTimeToMinutes(live.sunrise_today) : null;
  const todaySunsetMins = hasLiveSun ? parseTimeToMinutes(live.sunset_today) : null;
  const todaySunriseTime = hasLiveSun ? formatMinutesToTime(todaySunriseMins) : null;
  const todaySunsetTime = hasLiveSun ? formatMinutesToTime(todaySunsetMins) : null;

  let todayDaylight = null;
  if (todaySunriseMins !== null && todaySunsetMins !== null) {
    const diffMins = Math.max(0, todaySunsetMins - todaySunriseMins);
    const dHours = Math.floor(diffMins / 60);
    const dMins = Math.round(diffMins % 60);
    todayDaylight = `${dHours}h ${dMins}m`;
  }

  const validSunrises = Array.isArray(daily)
    ? daily
        .map((d) => parseTimeToMinutes(d.sunrise))
        .filter((m) => m !== null)
    : [];

  const validSunsets = Array.isArray(daily)
    ? daily
        .map((d) => parseTimeToMinutes(d.sunset))
        .filter((m) => m !== null)
    : [];

  const hasData = validSunrises.length > 0 && validSunsets.length > 0;

  if (!hasData && !hasLiveSun) return null;

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
        {(todayDaylight || daylightHours) && (
          <span className="card-status-pill daylight-pill">
            {hasLiveSun ? (
              <>
                <span className="live-pulse-dot" style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
                {todayDaylight} daylight today
              </>
            ) : (
              `${daylightHours} daylight`
            )}
          </span>
        )}
      </div>

      <div className="telemetry-body">
        <div className="telemetry-main-content">
          {hasLiveSun || hasData ? (
            <div className="sun-times-grid">
              <div className="sun-time-card">
                <div className="sun-time-header">
                  <span className="sun-time-icon">🌅</span>
                  <span className="sun-time-label">{hasLiveSun ? "Today's Sunrise" : "Average Sunrise"}</span>
                </div>
                <div className="sun-time-value">{hasLiveSun ? todaySunriseTime : avgSunriseTime}</div>
              </div>

              <div className="sun-time-card">
                <div className="sun-time-header">
                  <span className="sun-time-icon">🌇</span>
                  <span className="sun-time-label">{hasLiveSun ? "Today's Sunset" : "Average Sunset"}</span>
                </div>
                <div className="sun-time-value">{hasLiveSun ? todaySunsetTime : avgSunsetTime}</div>
              </div>
            </div>
          ) : (
            <div className="telemetry-empty-notice">
              <p>Sunrise & sunset records are unavailable for this range.</p>
            </div>
          )}
        </div>

        <div className="telemetry-bottom-group">
          <div className="telemetry-sub-stats">
            {hasData ? (
              <>
                <span className="sub-stat-item">
                  <span className="sub-stat-label">Period Avg:</span> {avgSunriseTime} – {avgSunsetTime}
                </span>
                {daylightHours && (
                  <>
                    <span className="sub-stat-divider">•</span>
                    <span className="sub-stat-item">
                      <span className="sub-stat-label">Daylight:</span> {daylightHours}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="sub-stat-item">Historical sun times unavailable</span>
            )}
          </div>

          {hasLiveSun ? (
            <div className="telemetry-live-strip">
              <span className="live-pulse-dot" />
              <span className="live-strip-label">Live Today:</span>
              <span className="live-strip-val">{todayDaylight} daylight</span>
              <span className="live-strip-sub">• {todaySunriseTime} to {todaySunsetTime}</span>
            </div>
          ) : (
            <div className="telemetry-live-slot-placeholder" />
          )}
        </div>
      </div>
    </div>
  );
}
