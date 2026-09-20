import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PRESETS = [
  { name: 'Peddapuram', fullName: 'Peddapuram, Andhra Pradesh, India', lat: 17.78, lon: 82.13 },
  { name: 'London', fullName: 'London, Greater London, United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', fullName: 'New York, New York, United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', fullName: 'Tokyo, Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
];

export default function LocationForm({ onSubmit, isLoading }) {
  const today = new Date().toISOString().split('T')[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Peddapuram',
    fullName: 'Peddapuram, Andhra Pradesh, India',
    lat: 17.78,
    lon: 82.13,
  });
  const [searchQuery, setSearchQuery] = useState('Peddapuram, Andhra Pradesh, India');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [start, setStart] = useState(sixMonthsAgo);
  const [end, setEnd] = useState(today);

  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

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

  const selectPlace = (place) => {
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
    if (!start || !end) return;

    // If a place is selected, submit with its coordinates
    if (selectedLocation) {
      onSubmit({
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        start,
        end,
        locationName: selectedLocation.fullName || selectedLocation.name,
      });
    } else if (suggestions.length > 0) {
      // Pick first suggestion if user typed without clicking
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
    <div className="card form-card">
      <div className="card-header">
        <h2>Location & Date Selection</h2>
        <div className="presets-list">
          <span className="preset-label">Quick Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`preset-btn ${selectedLocation?.name === p.name ? 'active' : ''}`}
              onClick={() => applyPreset(p)}
              disabled={isLoading}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="location-form">
        <div className="search-and-dates-grid">
          {/* Geocoding Search Box */}
          <div className="form-group search-group" ref={searchContainerRef}>
            <label htmlFor="location-search">
              Location Search{' '}
              {selectedLocation && (
                <span className="coords-hint">
                  ({selectedLocation.lat.toFixed(2)}°N, {selectedLocation.lon.toFixed(2)}°E)
                </span>
              )}
            </label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                id="location-search"
                type="text"
                autoComplete="off"
                placeholder="Search any city or place worldwide (e.g. Visakhapatnam, Paris)..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setIsDropdownOpen(true);
                }}
                disabled={isLoading}
              />
              {isSearching && <span className="input-spinner" />}
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
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

            {/* Geocoding Results Dropdown */}
            {isDropdownOpen && suggestions.length > 0 && (
              <ul className="suggestions-dropdown">
                {suggestions.map((item, idx) => (
                  <li
                    key={`${item.latitude}-${item.longitude}-${idx}`}
                    className="suggestion-item"
                    onClick={() => selectPlace(item)}
                  >
                    <span className="suggestion-pin">📍</span>
                    <div className="suggestion-text">
                      <strong className="suggestion-name">{item.name}</strong>
                      <span className="suggestion-details">
                        {[item.region, item.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <span className="suggestion-coords">
                      {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {isDropdownOpen && suggestions.length === 0 && !isSearching && searchQuery.trim().length >= 2 && (
              <div className="suggestions-dropdown no-results">
                No matching locations found.
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label htmlFor="start-date">Start Date</label>
            <input
              id="start-date"
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* End Date */}
          <div className="form-group">
            <label htmlFor="end-date">End Date</label>
            <input
              id="end-date"
              type="date"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="btn-loading">
                <span className="mini-spinner" /> Loading Data...
              </span>
            ) : (
              'Analyze Weather'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
