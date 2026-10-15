import React, { useState, useEffect, useRef } from 'react';
import { WeatherPulseMark } from './WeatherPulseLogo';
import './Hero.css';

export const CONDITIONS_ORDER = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];

export const CONDITION_METADATA = {
  clear: {
    key: 'clear',
    label: 'Clear',
    headline: 'Clear Sky',
    description: 'Unobstructed sunlight and luminous open skies with gentle breezes.',
    weathercode: 0,
  },
  cloudy: {
    key: 'cloudy',
    label: 'Cloudy',
    headline: 'Overcast',
    description: 'Soft diffused daylight filtered through dense atmospheric cloud layers.',
    weathercode: 3,
  },
  rain: {
    key: 'rain',
    label: 'Rain',
    headline: 'Rain',
    description: 'Steady precipitation bringing rhythmic cooling and fresh damp air.',
    weathercode: 61,
  },
  storm: {
    key: 'storm',
    label: 'Storm',
    headline: 'Thunderstorm',
    description: 'Dynamic squalls with charged electric lightning and rolling thunder.',
    weathercode: 95,
  },
  snow: {
    key: 'snow',
    label: 'Snow',
    headline: 'Snowfall',
    description: 'Pristine crystalline snowfall drifting quietly across a frozen expanse.',
    weathercode: 71,
  },
  fog: {
    key: 'fog',
    label: 'Fog',
    headline: 'Dense Fog',
    description: 'Mystic veil of condensed vapor reducing visibility and softening horizons.',
    weathercode: 45,
  },
};

/**
 * Maps WMO code from /api/current to condition group:
 * CLEAR: 0, 1
 * CLOUDY: 2, 3
 * FOG: 45, 48
 * RAIN: 51-67, 80-82
 * SNOW: 71-77, 85, 86
 * STORM: 95, 96, 99
 */
export function mapWmoToConditionGroup(wmoCode) {
  if (wmoCode === 0 || wmoCode === 1) return 'clear';
  if (wmoCode === 2 || wmoCode === 3) return 'cloudy';
  if (wmoCode === 45 || wmoCode === 48) return 'fog';
  if ([51, 52, 53, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 80, 81, 82].includes(wmoCode)) return 'rain';
  if ([71, 72, 73, 74, 75, 77, 85, 86].includes(wmoCode)) return 'snow';
  if ([95, 96, 99].includes(wmoCode)) return 'storm';
  return 'clear';
}

/**
 * Renders all 6 condition SVGs inside an orb container.
 * Sibling elements present at all times; active variant is toggled by class.
 */
function OrbArtContainer({ activeCondition, slotId }) {
  const p = slotId; // prefix to avoid duplicate IDs in gradient definitions

  return (
    <div className={`orb-svg-container is-${activeCondition}`}>
      {/* 1. Clear */}
      <svg className="orb-variant-svg orb-svg-clear" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`grad-clear-${p}`} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffe4a3" />
            <stop offset="52%" stopColor="#f2b04c" />
            <stop offset="100%" stopColor="#c97a24" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#grad-clear-${p})`} />
        <ellipse cx="78" cy="72" rx="42" ry="28" fill="#ffffff" fillOpacity="0.32" transform="rotate(-20 78 72)" />
        <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>

      {/* 2. Cloudy */}
      <svg className="orb-variant-svg orb-svg-cloudy" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`grad-cloudy-${p}`} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="55%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#grad-cloudy-${p})`} />
        <path
          d="M 50 114 A 24 24 0 0 1 74 90 A 36 36 0 0 1 130 80 A 30 30 0 0 1 166 102 A 22 22 0 0 1 160 114 Z"
          fill="#f8fafc"
          fillOpacity="0.92"
        />
        <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      </svg>

      {/* 3. Rain */}
      <svg className="orb-variant-svg orb-svg-rain" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`grad-rain-${p}`} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="52%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#grad-rain-${p})`} />
        <path
          d="M 52 92 A 22 22 0 0 1 74 72 A 32 32 0 0 1 126 64 A 26 26 0 0 1 158 84 A 18 18 0 0 1 154 92 Z"
          fill="#f1f5f9"
          fillOpacity="0.95"
        />
        <line x1="78" y1="108" x2="68" y2="132" stroke="#bae6fd" strokeWidth="5.5" strokeLinecap="round" />
        <line x1="104" y1="108" x2="94" y2="132" stroke="#bae6fd" strokeWidth="5.5" strokeLinecap="round" />
        <line x1="130" y1="108" x2="120" y2="132" stroke="#bae6fd" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      </svg>

      {/* 4. Storm */}
      <svg className="orb-variant-svg orb-svg-storm" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`grad-storm-${p}`} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#3b3b6d" />
            <stop offset="55%" stopColor="#242247" />
            <stop offset="100%" stopColor="#13112c" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#grad-storm-${p})`} />
        <path
          d="M 50 88 A 22 22 0 0 1 72 68 A 32 32 0 0 1 126 60 A 26 26 0 0 1 156 80 A 18 18 0 0 1 152 88 Z"
          fill="#64748b"
          fillOpacity="0.88"
        />
        <path
          d="M 104 84 L 88 116 L 105 116 L 94 148 L 124 108 L 108 108 Z"
          fill="#E8A33D"
        />
        <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      </svg>

      {/* 5. Snow */}
      <svg className="orb-variant-svg orb-svg-snow" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`grad-snow-${p}`} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="55%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#grad-snow-${p})`} />
        <path
          d="M 52 88 A 22 22 0 0 1 74 68 A 32 32 0 0 1 126 60 A 26 26 0 0 1 158 80 A 18 18 0 0 1 154 88 Z"
          fill="#ffffff"
          fillOpacity="0.96"
        />
        <g fill="#ffffff" opacity="0.92">
          <circle cx="76" cy="112" r="5" />
          <circle cx="102" cy="120" r="5.5" />
          <circle cx="128" cy="112" r="5" />
          <circle cx="88" cy="138" r="4" />
          <circle cx="116" cy="138" r="4" />
        </g>
        <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>

      {/* 6. Fog */}
      <svg className="orb-variant-svg orb-svg-fog" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`grad-fog-${p}`} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="55%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill={`url(#grad-fog-${p})`} />
        <rect x="48" y="80" width="104" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.85" />
        <rect x="36" y="100" width="128" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.75" />
        <rect x="58" y="120" width="84" height="9" rx="4.5" fill="#ffffff" fillOpacity="0.8" />
        <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function Hero({
  theme = 'light',
  currentWeather = null,
  locationName = 'Peddapuram',
  splashDone = false,
  onEntranceFinish = () => {},
  previewCondition = null,
  onPreviewChange = () => {},
}) {
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const burgerRef = useRef(null);

  // Compute live condition key from real data
  const liveConditionKey = (() => {
    if (currentWeather?.weathercode !== undefined && currentWeather?.weathercode !== null) {
      return mapWmoToConditionGroup(currentWeather.weathercode);
    }
    return 'clear';
  })();

  // Current featured condition key (previewed or live)
  const featuredKey = previewCondition || liveConditionKey;
  const featured = CONDITION_METADATA[featuredKey] || CONDITION_METADATA.clear;

  // Determine left and right orbs using circular ORDER
  const featuredIndex = CONDITIONS_ORDER.indexOf(featuredKey);
  const prevConditionKey =
    CONDITIONS_ORDER[(featuredIndex - 1 + CONDITIONS_ORDER.length) % CONDITIONS_ORDER.length];
  const nextConditionKey =
    CONDITIONS_ORDER[(featuredIndex + 1) % CONDITIONS_ORDER.length];

  const prevCondition = CONDITION_METADATA[prevConditionKey];
  const nextCondition = CONDITION_METADATA[nextConditionKey];

  // Live line text: City · 33.9°C · feels like 39.1°C
  const cityName = (locationName || 'Location').split(',')[0].trim();
  const hasLiveData =
    currentWeather &&
    currentWeather.temperature_c !== null &&
    currentWeather.temperature_c !== undefined;

  const liveLineText = hasLiveData
    ? `${cityName} · ${currentWeather.temperature_c.toFixed(1)}°C · feels like ${
        currentWeather.feels_like_c !== null && currentWeather.feels_like_c !== undefined
          ? `${currentWeather.feels_like_c.toFixed(1)}°C`
          : `${currentWeather.temperature_c.toFixed(1)}°C`
      }`
    : '';

  // Entrance Animation Sequencing
  useEffect(() => {
    if (!splashDone) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      document.documentElement.classList.remove('anim', 'play');
      onEntranceFinish();
      return;
    }

    let cancelled = false;
    let timerId = null;

    const triggerPlay = () => {
      if (cancelled) return;
      // Two nested requestAnimationFrames as per specs
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          document.documentElement.classList.add('play');

          // Clean up .anim and .play after ~2.15s
          timerId = setTimeout(() => {
            document.documentElement.classList.remove('anim', 'play');
            onEntranceFinish();
          }, 2150);
        });
      });
    };

    // Wait for document.fonts.ready with 500ms timeout guard
    let fontGuardTimer = setTimeout(triggerPlay, 500);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          clearTimeout(fontGuardTimer);
          triggerPlay();
        })
        .catch(() => {
          clearTimeout(fontGuardTimer);
          triggerPlay();
        });
    } else {
      triggerPlay();
    }

    return () => {
      cancelled = true;
      clearTimeout(fontGuardTimer);
      if (timerId) clearTimeout(timerId);
      document.documentElement.classList.remove('anim', 'play');
    };
  }, [splashDone]);

  // Close nav drawer on click outside or Escape
  useEffect(() => {
    if (!navDrawerOpen) return;

    const handleClickOutside = (e) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target) &&
        burgerRef.current &&
        !burgerRef.current.contains(e.target)
      ) {
        setNavDrawerOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNavDrawerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navDrawerOpen]);

  const scrollToSection = (id) => {
    setNavDrawerOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrevCondition = () => {
    onPreviewChange(prevConditionKey);
  };

  const handleNextCondition = () => {
    onPreviewChange(nextConditionKey);
  };

  const handleResetToLive = () => {
    onPreviewChange(null);
  };

  return (
    <section className="weatherpulse-hero" aria-label="WeatherPulse Hero">
      {/* Polite aria-live region announcing preview / live state changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {previewCondition
          ? `Previewing ${featured.label}`
          : 'Showing live conditions'}
      </div>

      {/* Fixed Nav */}
      <nav className="hero-nav" aria-label="Hero navigation">
        <a
          href="#dashboard"
          className="hero-brand"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('dashboard');
          }}
          aria-label="WeatherPulse Home"
        >
          <WeatherPulseMark theme={theme} width={42} />
          <span className="hero-brand-name">WeatherPulse</span>
        </a>

        {/* Desktop Nav Links */}
        <div className="hero-nav-links">
          <a
            href="#dashboard"
            className="hero-nav-link active"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('dashboard');
            }}
          >
            Live
          </a>
          <a
            href="#trends-section"
            className="hero-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('trends-section');
            }}
          >
            Trends
          </a>
          <a
            href="#telemetry-section"
            className="hero-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('telemetry-section');
            }}
          >
            Telemetry
          </a>
          <a
            href="#forecast-section"
            className="hero-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('forecast-section');
            }}
          >
            Forecast
          </a>
          <button
            type="button"
            className="hero-analyze-pill"
            onClick={() => scrollToSection('search-section')}
          >
            Analyze
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          ref={burgerRef}
          type="button"
          className="hero-burger-btn"
          aria-expanded={navDrawerOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setNavDrawerOpen((prev) => !prev)}
        >
          ☰
        </button>

        {/* Hairline 2px below nav */}
        <div className="hero-nav-hairline" />
      </nav>

      {/* Collapsed Mobile Navigation Drawer */}
      {navDrawerOpen && (
        <div ref={drawerRef} className="hero-nav-drawer" role="menu">
          <a
            href="#dashboard"
            className="hero-nav-link active"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('dashboard');
            }}
            role="menuitem"
          >
            Live
          </a>
          <a
            href="#trends-section"
            className="hero-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('trends-section');
            }}
            role="menuitem"
          >
            Trends
          </a>
          <a
            href="#telemetry-section"
            className="hero-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('telemetry-section');
            }}
            role="menuitem"
          >
            Telemetry
          </a>
          <a
            href="#forecast-section"
            className="hero-nav-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('forecast-section');
            }}
            role="menuitem"
          >
            Forecast
          </a>
          <button
            type="button"
            className="hero-analyze-pill"
            onClick={() => scrollToSection('search-section')}
            role="menuitem"
          >
            Analyze
          </button>
        </div>
      )}

      {/* Hero Content Layer */}
      <div className="hero-content-layer">
        {/* Main Column */}
        <div className="hero-main-column">
          <h2 className="hero-eyebrow">
            {previewCondition ? 'PREVIEWING' : 'LIVE CONDITION'}
          </h2>

          <div className="hero-headline-wrap">
            <h1 className="hero-headline">{featured.headline}</h1>
          </div>

          <div className="hero-amber-rule" />

          <div className="hero-copy-block">
            {liveLineText && (
              <div className="hero-live-line">{liveLineText}</div>
            )}
            <p className="hero-condition-desc">{featured.description}</p>

            {previewCondition && (
              <button
                type="button"
                className="hero-preview-chip"
                onClick={handleResetToLive}
                title="Return to real live condition"
              >
                <span className="chip-dot" />
                <span>Previewing · Back to live</span>
              </button>
            )}
          </div>
        </div>

        {/* Button Row with Flanking Condition Orbs */}
        <div className="hero-button-row">
          {/* Left Condition Orb */}
          <button
            type="button"
            className="hero-orb hero-orb-left"
            onClick={handlePrevCondition}
            aria-label={`Preview ${prevCondition.label}`}
          >
            <OrbArtContainer activeCondition={prevConditionKey} slotId="left" />
          </button>

          {/* Left Serif Label */}
          <span className="hero-orb-label hero-orb-label-left">
            {prevCondition.label}
          </span>

          {/* Centered OPEN DASHBOARD Pill Button */}
          <button
            type="button"
            className="hero-open-btn"
            onClick={() => scrollToSection('dashboard')}
          >
            OPEN DASHBOARD
          </button>

          {/* Right Serif Label */}
          <span className="hero-orb-label hero-orb-label-right">
            {nextCondition.label}
          </span>

          {/* Right Condition Orb */}
          <button
            type="button"
            className="hero-orb hero-orb-right"
            onClick={handleNextCondition}
            aria-label={`Preview ${nextCondition.label}`}
          >
            <OrbArtContainer activeCondition={nextConditionKey} slotId="right" />
          </button>
        </div>

        {/* Scroll Control Button */}
        <button
          type="button"
          className="hero-scroll-btn"
          onClick={() => scrollToSection('dashboard')}
          aria-label="Scroll down to dashboard"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </button>
      </div>
    </section>
  );
}
