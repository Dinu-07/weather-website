import React, { useEffect, useState } from 'react';
import { WeatherPulseMark } from './WeatherPulseLogo';
import './SplashScreen.css';

/**
 * SplashScreen Component
 *
 * Full-viewport branded launch overlay that animates the WeatherPulse monogram,
 * wordmark, and tagline, then fades away and calls onFinish().
 *
 * Requirements:
 * - Rendered only on initial page load, at root level with highest z-index.
 * - Solid background matching current theme (#DDEBFA in light, #232C4D in dark).
 * - Locks page scroll while visible, restores on unmount.
 * - Fires onFinish() when finished so location prompt and background can activate.
 * - role="status" and aria-label="Loading WeatherPulse".
 * - Respects prefers-reduced-motion (finishes at ~1.2s instead of ~2.4s).
 */
export default function SplashScreen({ theme = 'light', onFinish }) {
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // 1. Lock page scrolling while splash is visible
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 2. Determine animation duration based on reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Normal: 2.0s hold + 0.4s fadeout = 2.4s total. Reduced motion: ~1.2s total.
    const duration = prefersReducedMotion ? 1200 : 2400;

    const timer = setTimeout(() => {
      setIsMounted(false);
      if (typeof onFinish === 'function') {
        onFinish();
      }
    }, duration);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
    };
  }, [onFinish]);

  if (!isMounted) return null;

  const isDark = theme === 'dark';

  return (
    <div
      className={`splash-screen-overlay ${isDark ? 'dark-theme' : 'light-theme'}`}
      role="status"
      aria-label="Loading WeatherPulse"
    >
      <div className="splash-content-box">
        {/* Animated WeatherPulse Mark (120-150px wide) */}
        <div className="splash-mark-wrapper">
          <WeatherPulseMark
            theme={theme}
            animated={true}
            width={135}
            className="splash-logo-mark"
          />
        </div>

        {/* Wordmark: semi-bold, ~28px, matching header typography */}
        <div className="splash-wordmark">WeatherPulse</div>

        {/* Tagline: small, muted */}
        <p className="splash-tagline">Where every reading has a beat</p>
      </div>
    </div>
  );
}
