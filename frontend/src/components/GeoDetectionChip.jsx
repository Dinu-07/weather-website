import React, { useRef } from 'react';
import './GeoDetectionChip.css';

/**
 * GeoDetectionChip
 *
 * Small, calm chip shown directly below the search bar after an automatic
 * geolocation fix.  Hidden when the user has manually picked a location.
 *
 * Props:
 *   detectedLocation  – { displayName, isApproximate, accuracy }  (null = hide)
 *   onSearchFocus     – callback: focus + select search input text
 *   onChangeLocation  – callback: clears the detected chip (user wants to search)
 *   theme             – 'light' | 'dark'
 */
export default function GeoDetectionChip({
  detectedLocation,
  onSearchFocus,
  onChangeLocation,
  theme = 'light',
}) {
  if (!detectedLocation) return null;

  const { displayName, isApproximate, accuracy } = detectedLocation;

  // Format accuracy label: ±800 m  or  ±35 km
  const fmtAccuracy = (m) => {
    if (!m || isNaN(m)) return '';
    if (m < 1000) return `±${Math.round(m)} m`;
    return `±${Math.round(m / 1000)} km`;
  };

  const accuracyLabel = fmtAccuracy(accuracy);

  if (isApproximate) {
    // Approximate fix — full sentence is a button that focuses the search input
    return (
      <div className="geo-chip geo-chip--approximate" data-theme={theme} role="status">
        <span className="geo-chip__dot geo-chip__dot--approx" aria-hidden="true" />
        <span className="geo-chip__text">
          Detected:{' '}
          <strong className="geo-chip__name">{displayName}</strong>
          {accuracyLabel ? ` · approximate (${accuracyLabel})` : ' · approximate'}.{' '}
        </span>
        <button
          type="button"
          className="geo-chip__action-btn"
          onClick={onSearchFocus}
          aria-label="Search for your exact location"
        >
          Not your town? Search it above
        </button>
      </div>
    );
  }

  // Accurate fix
  return (
    <div className="geo-chip geo-chip--accurate" data-theme={theme} role="status">
      <span className="geo-chip__dot geo-chip__dot--accurate" aria-hidden="true" />
      <span className="geo-chip__text">
        Detected:{' '}
        <strong className="geo-chip__name">{displayName}</strong>
        {accuracyLabel ? ` · ${accuracyLabel}` : ''}
      </span>
      <button
        type="button"
        className="geo-chip__change-btn"
        onClick={onChangeLocation}
        aria-label="Change detected location"
      >
        Change
      </button>
    </div>
  );
}
