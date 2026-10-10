import React from 'react';

/**
 * WeatherPulse Hero Logo Component
 * Supports Light & Dark theme variants with identical geometry.
 *
 * Light mode:
 * - Background: pale blue rounded rect (#DDEBFA)
 * - Clouds: soft white clusters (#FFFFFF, 0.88 opacity)
 * - Sparkle stars: gold (#F4C078)
 * - WP monogram: navy (#1D3557) with solid amber (#E8A33D) loop
 * - Wordmark: "WeatherPulse" in navy (#1D3557)
 *
 * Dark mode:
 * - Background: deep dusk navy-purple (#232C4D)
 * - Clouds: muted shadow-toned clusters (#3A4570, 0.55 opacity)
 * - Sparkle stars: light cream (#F2EFE8)
 * - WP monogram: light cream (#F2EFE8) with solid amber (#E8A33D) loop
 * - Wordmark: "WeatherPulse" in light cream (#F2EFE8)
 */
export default function WeatherPulseLogo({
  theme = 'light',
  height = 52,
  className = '',
  showWordmark = true,
}) {
  const isDark = theme === 'dark';

  // Palette definitions
  const bgColor = isDark ? '#232C4D' : '#DDEBFA';
  const cloudColor = isDark ? '#3A4570' : '#FFFFFF';
  const cloudOpacity = isDark ? 0.55 : 0.88;
  const starColor = isDark ? '#F2EFE8' : '#F4C078';
  const markColor = isDark ? '#F2EFE8' : '#1D3557';
  const amberColor = '#E8A33D';
  const wordmarkColor = isDark ? '#F2EFE8' : '#1D3557';

  // Compute SVG dimensions and viewBox
  const viewBoxWidth = 160;
  const viewBoxHeight = showWordmark ? 134 : 100;
  const computedWidth = Math.round((height * viewBoxWidth) / viewBoxHeight);

  // Sparkle star generator (4-point star)
  const renderSparkle = (cx, cy, s, key) => (
    <path
      key={key}
      d={`M ${cx} ${cy - s} Q ${cx} ${cy} ${cx + s} ${cy} Q ${cx} ${cy} ${cx} ${cy + s} Q ${cx} ${cy} ${cx - s} ${cy} Q ${cx} ${cy} ${cx} ${cy - s} Z`}
    />
  );

  const clipId = `wp-emblem-clip-${isDark ? 'dark' : 'light'}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      height={height}
      width={computedWidth}
      role="img"
      aria-label="WeatherPulse Logo"
      className={`weatherpulse-hero-logo ${className}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="12" y="6" width="136" height="88" rx="18" />
        </clipPath>
      </defs>

      {/* Emblem Background Rounded Rectangle */}
      <rect
        x="12"
        y="6"
        width="136"
        height="88"
        rx="18"
        fill={bgColor}
        style={{ transition: 'fill 0.25s ease' }}
      />

      {/* Corner Cloud Clusters (clipped to rounded emblem) */}
      <g
        clipPath={`url(#${clipId})`}
        fill={cloudColor}
        fillOpacity={cloudOpacity}
        style={{ transition: 'fill 0.25s ease, fill-opacity 0.25s ease' }}
      >
        {/* Top-left cluster */}
        <ellipse cx="22" cy="18" rx="18" ry="14" />
        <ellipse cx="40" cy="14" rx="15" ry="12" />
        <ellipse cx="26" cy="30" rx="14" ry="10" />

        {/* Bottom-right cluster */}
        <ellipse cx="136" cy="82" rx="18" ry="14" />
        <ellipse cx="118" cy="86" rx="15" ry="12" />
        <ellipse cx="132" cy="70" rx="14" ry="10" />
      </g>

      {/* Scattered Sparkle Stars */}
      <g fill={starColor} style={{ transition: 'fill 0.25s ease' }}>
        {renderSparkle(34, 58, 4, 's1')}
        {renderSparkle(126, 24, 5, 's2')}
        {renderSparkle(86, 18, 3.5, 's3')}
        {renderSparkle(128, 54, 3.5, 's4')}
      </g>

      {/* Centered WP Monogram */}
      {/* Zigzag W path (5 points: down-up-down-up) */}
      <path
        d="M 45 36 L 55 64 L 65 41 L 75 64 L 85 36"
        fill="none"
        stroke={markColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'stroke 0.25s ease' }}
      />

      {/* P vertical spine */}
      <path
        d="M 98 36 L 98 64"
        fill="none"
        stroke={markColor}
        strokeWidth="7"
        strokeLinecap="round"
        style={{ transition: 'stroke 0.25s ease' }}
      />

      {/* P loop: Solid warm amber circle accent (constant across light/dark) */}
      <circle cx="107" cy="43" r="8.5" fill={amberColor} />

      {/* WeatherPulse Wordmark */}
      {showWordmark && (
        <text
          x="80"
          y="122"
          textAnchor="middle"
          fill={wordmarkColor}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="16"
          fontWeight="700"
          letterSpacing="-0.3px"
          style={{ transition: 'fill 0.25s ease' }}
        >
          WeatherPulse
        </text>
      )}
    </svg>
  );
}

/**
 * Shared WeatherPulse Monogram Mark Component
 * ViewBox: "52 62 94 76"
 * Used in SplashScreen and anywhere standalone mark geometry is needed.
 */
export function WeatherPulseMark({
  theme = 'light',
  className = '',
  animated = false,
  width = 110,
}) {
  const isDark = theme === 'dark';
  const markColor = isDark ? '#F2EFE8' : '#1D3557';
  const amberColor = '#E8A33D';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="52 62 94 76"
      width={width}
      className={`weatherpulse-mark ${animated ? 'animated' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {/* W zigzag path */}
      <path
        className="splash-mark-w"
        d="M60 70 L72 112 L84 78 L96 112 L108 70"
        fill="none"
        stroke={markColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />

      {/* P stem path */}
      <path
        className="splash-mark-p"
        d="M108 70 L108 130"
        fill="none"
        stroke={markColor}
        strokeWidth="7"
        strokeLinecap="round"
        pathLength="1"
      />

      {/* Ripple ring from dot */}
      <circle
        className="splash-ripple-ring"
        cx="123"
        cy="85"
        r="14"
        fill="none"
        stroke={amberColor}
        strokeWidth="2.5"
      />

      {/* Amber dot */}
      <circle
        className="splash-amber-dot"
        cx="123"
        cy="85"
        r="14"
        fill={amberColor}
      />
    </svg>
  );
}

