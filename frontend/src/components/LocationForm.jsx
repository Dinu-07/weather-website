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
