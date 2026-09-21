import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PRESETS = [
  { name: 'Peddapuram', fullName: 'Peddapuram, Andhra Pradesh, India', lat: 17.08, lon: 82.13 },
  { name: 'London', fullName: 'London, Greater London, United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', fullName: 'New York, New York, United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', fullName: 'Tokyo, Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
];

const GEO_DISMISSED_KEY = 'weather_geo_prompt_dismissed';

function getSessionDismissed() {
  try {
    return sessionStorage.getItem(GEO_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setSessionDismissed() {
  try {
    sessionStorage.setItem(GEO_DISMISSED_KEY, 'true');
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

function formatBigDataCloudLocation(data, lat, lon) {
  if (!data) return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  const primaryName = data.city || data.locality || data.principalSubdivision || '';
  const subdivision =
    data.principalSubdivision && data.principalSubdivision !== primaryName
      ? data.principalSubdivision
      : '';
  const country =
    data.countryName && data.countryName !== primaryName && data.countryName !== subdivision
      ? data.countryName
      : !primaryName
        ? data.countryName || ''
        : '';
  const parts = [primaryName, subdivision, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

export default function LocationForm({ onSubmit, isLoading }) {
  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Peddapuram',
    fullName: 'Peddapuram, Andhra Pradesh, India',
    lat: 17.08,
    lon: 82.13,
  });
  const [searchQuery, setSearchQuery] = useState('Peddapuram, Andhra Pradesh, India');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [start, setStart] = useState(() => {
    return new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  });
  const [end, setEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Geolocation banner and feedback state
  const [geoDismissed, setGeoDismissed] = useState(getSessionDismissed);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState(null);

  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle debounced geocoding search
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${baseUrl}/api/geocode`, {
          params: { query: query.trim() },
        });
        setSuggestions(res.data || []);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Geocoding search failed:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Clean up feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showFeedbackMessage = (msg, duration = 4000) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setGeoFeedback(msg);
    feedbackTimerRef.current = setTimeout(() => {
      setGeoFeedback(null);
    }, duration);
  };

  const handleDismissPrompt = () => {
    setSessionDismissed();
    setGeoDismissed(true);
  };

  const handleAllowLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      handleDismissPrompt();
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const res = await axios.get('https://api.bigdatacloud.net/data/reverse-geocode-client', {
            params: {
              latitude: lat,
              longitude: lon,
              localityLanguage: 'en',
            },
            timeout: 8000,
          });

          const placeName = formatBigDataCloudLocation(res.data, lat, lon);
          const shortName =
            res.data?.city || res.data?.locality || res.data?.principalSubdivision || placeName;

          setSelectedLocation({
            name: shortName,
            fullName: placeName,
            lat,
            lon,
          });
          setSearchQuery(placeName);

          onSubmit({
            lat,
            lon,
            start,
            end,
            locationName: placeName,
          });
        } catch (err) {
          console.warn('Reverse geocode failed, falling back to coordinates:', err);
          const fallbackName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
          setSelectedLocation({
            name: fallbackName,
            fullName: fallbackName,
            lat,
            lon,
          });
          setSearchQuery(fallbackName);
          onSubmit({
            lat,
            lon,
            start,
            end,
            locationName: fallbackName,
          });
        } finally {
          setGeoLoading(false);
          handleDismissPrompt();
        }
      },
      (error) => {
        setGeoLoading(false);
        handleDismissPrompt();

        if (error.code === 1) {
          // PERMISSION_DENIED
          showFeedbackMessage('No problem, search for a location instead');
        } else {
          console.warn('Geolocation error:', error.message || error);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const selectPlace = (place) => {
    handleDismissPrompt();
    setSelectedLocation({
      name: place.name,
      fullName: place.display_name,
      lat: place.latitude,
      lon: place.longitude,
    });
    setSearchQuery(place.display_name);
    setIsDropdownOpen(false);
    setSuggestions([]);
  };

  const applyPreset = (preset) => {
    handleDismissPrompt();
    setSelectedLocation({
      name: preset.name,
      fullName: preset.fullName,
      lat: preset.lat,
      lon: preset.lon,
    });
    setSearchQuery(preset.fullName);
    setIsDropdownOpen(false);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleDismissPrompt();
    if (!start || !end) return;

    if (selectedLocation) {
      onSubmit({
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        start,
        end,
        locationName: selectedLocation.fullName || selectedLocation.name,
      });
    } else if (suggestions.length > 0) {
      const topMatch = suggestions[0];
      selectPlace(topMatch);
      onSubmit({
        lat: topMatch.latitude,
        lon: topMatch.longitude,
        start,
        end,
        locationName: topMatch.display_name,
      });
    }
  };

  return (
    <div className="search-control-wrapper">
      <form onSubmit={handleSubmit} className="search-form-layout">
        {/* Geolocation Permission Banner */}
        {!geoDismissed && (
          <div className="geo-prompt-banner" role="region" aria-label="Location permission prompt">
            <div className="geo-banner-content">
              <span className="geo-banner-icon" aria-hidden="true">📍</span>
              <span className="geo-banner-text">Use my current location for local weather?</span>
            </div>
            <div className="geo-banner-actions">
              <button
                type="button"
                className="geo-btn-allow"
                onClick={handleAllowLocation}
                disabled={geoLoading || isLoading}
              >
                {geoLoading ? (
                  <span className="geo-loading-flex">
                    <span className="pill-spinner-btn" /> Locating...
                  </span>
                ) : (
                  'Allow'
                )}
              </button>
              <button
                type="button"
                className="geo-btn-dismiss"
                onClick={handleDismissPrompt}
                disabled={geoLoading || isLoading}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Geolocation Feedback Message (e.g. permission denied) */}
        {geoFeedback && (
          <div className="geo-banner-feedback" role="status">
            <span className="geo-feedback-text">{geoFeedback}</span>
            <button
              type="button"
              className="geo-feedback-close"
              onClick={() => setGeoFeedback(null)}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Pill-shaped search bar */}
        <div className="pill-search-container" ref={searchContainerRef}>
          <div className="pill-search-bar">
            <span className="pill-search-icon">🔍</span>
            <input
              type="text"
              className="pill-search-input"
              autoComplete="off"
              placeholder="Search city, town, or coordinates worldwide..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (suggestions.length > 0) setIsDropdownOpen(true);
              }}
              disabled={isLoading}
            />

            {isSearching && <span className="pill-spinner" />}

            {searchQuery && (
              <button
                type="button"
                className="pill-clear-btn"
                title="Clear search"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setIsDropdownOpen(false);
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <ul className="pill-dropdown-menu">
              {suggestions.map((item, idx) => (
                <li
                  key={`${item.latitude}-${item.longitude}-${idx}`}
                  className="pill-dropdown-item"
                  onClick={() => selectPlace(item)}
                >
                  <span className="item-icon">📍</span>
                  <div className="item-details">
                    <strong className="item-name">{item.name}</strong>
                    <span className="item-sub">
                      {[item.region, item.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <span className="item-coords">
                    {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                  </span>
                </li>
              ))}
            </ul>
          )}

          {isDropdownOpen && suggestions.length === 0 && !isSearching && searchQuery.trim().length >= 2 && (
            <div className="pill-dropdown-menu pill-no-results">
              No matching locations found.
            </div>
          )}
        </div>

        {/* Date & Action Controls */}
        <div className="controls-row">
          <div className="date-inputs-group">
            <div className="date-input-wrapper">
              <label htmlFor="start-date" className="date-label">From</label>
              <input
                id="start-date"
                type="date"
                className="clean-date-input"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="date-input-wrapper">
              <label htmlFor="end-date" className="date-label">To</label>
              <input
                id="end-date"
                type="date"
                className="clean-date-input"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="clean-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading-flex">
                <span className="pill-spinner-btn" /> Loading...
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="presets-pill-row">
          <span className="presets-caption">Popular:</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`preset-pill ${selectedLocation?.name === p.name ? 'active' : ''}`}
              onClick={() => applyPreset(p)}
              disabled={isLoading}
            >
              {p.name}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
