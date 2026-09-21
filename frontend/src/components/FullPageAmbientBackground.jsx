import React, { useEffect, useRef, useState, useMemo } from 'react';

/**
 * Generates an evenly dispersed array of stars across the full viewport (0-100% width & height).
 */
function generateStars(count = 72) {
  const stars = [];
  const palette = ['#ffffff', '#ffffff', '#ffffff', '#e0f2fe', '#bae6fd', '#fef3c7'];

  for (let i = 0; i < count; i++) {
    const size = i % 10 === 0 ? 3 : i % 4 === 0 ? 2 : i % 2 === 0 ? 1.5 : 1;
    const color = palette[i % palette.length];
    stars.push({
      id: i,
      x: `${(Math.random() * 98 + 1).toFixed(1)}%`,
      y: `${(Math.random() * 98 + 1).toFixed(1)}%`,
      size,
      color,
      baseOpacity: Number((0.35 + Math.random() * 0.55).toFixed(2)),
      duration: `${(2.2 + Math.random() * 3.6).toFixed(1)}s`,
      delay: `${(Math.random() * 5).toFixed(1)}s`,
      hasGlow: size >= 2,
    });
  }
  return stars;
}

/**
 * FullPageAmbientBackground
 * Fixed-position, full-viewport ambient atmospheric layer.
 * Tied directly to the `theme` state variable ('dark' vs 'light').
 */
export default function FullPageAmbientBackground({
  theme = 'light',
  weathercode = 0,
  _cloudCover = 50,
  _totalWetDays = 0,
  _totalDays = 1,
  windSpeed = 10,
  isPlaying = true,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const flashTimerRef = useRef(null);
  const isLightningActiveRef = useRef(false);

  // Discrete weather categories from WMO code
  const isClear = weathercode === 0 || weathercode === 1;
  const isPartlyCloudy = weathercode === 2;
  const isOvercast = weathercode === 3;
  const isFog = weathercode === 45 || weathercode === 48;
  const isDrizzle = [51, 53, 55, 56, 57].includes(weathercode);
  const isRain = [61, 63, 65, 66, 67, 80, 81, 82].includes(weathercode);
  const isSnow = [71, 73, 75, 77, 85, 86].includes(weathercode);
  const isStorm = [95, 96, 99].includes(weathercode);

  // Dynamic starfield opacity in dark mode based on condition obscuration
  const starfieldOpacity = (() => {
    if (isClear) return 1.0;
    if (isPartlyCloudy) return 0.65;
    if (isFog) return 0.20;
    if (isDrizzle) return 0.30;
    if (isRain || isSnow) return 0.15;
    if (isOvercast || isStorm) return 0.04;
    return 0.70;
  })();

  // Scaled parameters for canvas particles
  const rainCount = isDrizzle ? 45 : isStorm ? 135 : isRain ? 90 : 0;
  const rainSpeed = isDrizzle ? 5.5 : isStorm ? 14 : 9.5;
  const rainAngle = Math.min(Math.max((windSpeed - 5) * 0.35, 0), 18) * (Math.PI / 180);

  // Memoized starfield for dark mode
  const stars = useMemo(() => generateStars(75), []);

  // Shooting star / comet state for dark mode (clear & partly cloudy skies only)
  const [comet, setComet] = useState({ active: false, top: '15%', left: '75%' });

  // Comet launcher loop (Dark mode only, every 15-25 seconds during clear/partly cloudy skies)
  useEffect(() => {
    if (theme !== 'dark' || !isPlaying || (!isClear && !isPartlyCloudy)) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let timeoutId = null;

    const launchComet = () => {
      const top = 5 + Math.random() * 26; // 5% to 31%
      const left = 55 + Math.random() * 38; // 55% to 93%
      setComet({
        active: true,
        top: `${top.toFixed(1)}%`,
        left: `${left.toFixed(1)}%`,
      });

      setTimeout(() => {
        setComet((prev) => ({ ...prev, active: false }));
      }, 1250);

      const nextDelay = 15000 + Math.random() * 10000; // 15 to 25s
      timeoutId = setTimeout(launchComet, nextDelay);
    };

    // First comet after 3 seconds in dark mode
    timeoutId = setTimeout(launchComet, 3000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [theme, isPlaying, isClear, isPartlyCloudy]);

  // Full-viewport Canvas Particle System (Rain / Drizzle / Snow / Lightning)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dpr = window.devicePixelRatio || 1;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const setupCanvas = () => {
      dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvas();

    const handleResize = () => {
      if (!canvas) return;
      setupCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Initialize particles
    const particles = [];
    const count = isSnow ? 65 : (isDrizzle || isRain || isStorm) ? rainCount : 0;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: isSnow ? 0 : isDrizzle ? 8 + Math.random() * 8 : isStorm ? 18 + Math.random() * 14 : 13 + Math.random() * 10,
        speed: isSnow ? 0.9 + Math.random() * 1.5 : rainSpeed + Math.random() * 4,
        size: isSnow ? 1.5 + Math.random() * 2.5 : isDrizzle ? 1.0 : isStorm ? 1.8 : 1.3,
        opacity: isSnow ? 0.35 + Math.random() * 0.5 : isDrizzle ? 0.22 + Math.random() * 0.25 : isStorm ? 0.45 + Math.random() * 0.35 : 0.32 + Math.random() * 0.35,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.03,
      });
    }

    // Occasional subtle lightning flash trigger for thunderstorm
    if (isStorm && isPlaying && !prefersReducedMotion) {
      const scheduleFlash = () => {
        const delay = 7000 + Math.random() * 6000; // 7 to 13s
        flashTimerRef.current = setTimeout(() => {
          isLightningActiveRef.current = true;
          setTimeout(() => {
            isLightningActiveRef.current = false;
            scheduleFlash();
          }, 150);
        }, delay);
      };
      scheduleFlash();
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Thunderstorm soft screen flash
      if (isLightningActiveRef.current) {
        ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.50)';
        ctx.fillRect(0, 0, width, height);
      }

      if ((isDrizzle || isRain || isStorm) && count > 0) {
        const strokeColor = theme === 'dark'
          ? (isStorm ? 'rgba(186, 230, 253, 0.65)' : isDrizzle ? 'rgba(125, 211, 252, 0.32)' : 'rgba(125, 211, 252, 0.48)')
          : (isStorm ? 'rgba(2, 132, 199, 0.65)' : isDrizzle ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.50)');
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isStorm ? 1.8 : isDrizzle ? 1.0 : 1.4;
        ctx.lineCap = 'round';

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.sin(rainAngle) * p.length, p.y + Math.cos(rainAngle) * p.length);
          ctx.stroke();

          if (isPlaying && !prefersReducedMotion) {
            p.y += p.speed;
            p.x += Math.sin(rainAngle) * p.speed;

            if (p.y > height) {
              p.y = -p.length;
              p.x = Math.random() * width;
            }
          }
        }
      } else if (isSnow && count > 0) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          if (isPlaying && !prefersReducedMotion) {
            p.y += p.speed;
            p.swayOffset += p.swaySpeed;
            p.x += Math.sin(p.swayOffset) * 0.8;

            if (p.y > height) {
              p.y = -6;
              p.x = Math.random() * width;
            }
          }
        }
      }

      if (isPlaying && !document.hidden && !prefersReducedMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    // Page Visibility API
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      } else if (isPlaying && !prefersReducedMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isPlaying && !prefersReducedMotion) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      render();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [weathercode, rainCount, rainSpeed, rainAngle, isSnow, isDrizzle, isRain, isStorm, isPlaying, theme]);

  const pausedClass = isPlaying ? 'playing' : 'paused';

  return (
    <div
      className={`full-page-ambient-layer ${theme}-mode ${pausedClass}`}
      aria-hidden="true"
    >
      {/* 1. Subtle Slow-Moving Gradient Base (Theme-Specific) */}
      <div className={`full-page-gradient-mesh ${theme === 'dark' ? 'grad-dark' : 'grad-light'}`} />

      {/* 2. DARK MODE: Starfield & Comet (with condition-driven opacity and visibility) */}
      {theme === 'dark' && (
        <div
          className="full-page-night-sky"
          style={{
            opacity: starfieldOpacity,
            transition: 'opacity 0.8s ease',
          }}
        >
          {stars.map((s) => (
            <span
              key={s.id}
              className={`full-page-star ${s.hasGlow ? 'star-glow' : ''}`}
              style={{
                top: s.y,
                left: s.x,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: s.color,
                opacity: s.baseOpacity,
                animationDuration: s.duration,
                animationDelay: s.delay,
              }}
            />
          ))}

          {/* Prominent Glowing Shooting Star / Comet */}
          {comet.active && (isClear || isPartlyCloudy) && (
            <div
              className="full-page-comet-wrapper"
              style={{ top: comet.top, left: comet.left }}
            >
              <div className="full-page-comet-nucleus" />
              <div className="full-page-comet-tail" />
            </div>
          )}
        </div>
      )}

      {/* 3. CELESTIAL GLOW: Clear Sky (Sun in Light Mode, Moon in Dark Mode) */}
      {isClear && (
        <>
          {theme === 'light' ? (
            <div className="full-page-sun-glow">
              <div className="sun-radial-halo" />
              <svg viewBox="0 0 500 500" className="sun-rotating-rays">
                <defs>
                  <linearGradient id="fullPageRayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => (
                  <line
                    key={deg}
                    x1="250"
                    y1="60"
                    x2="250"
                    y2="10"
                    stroke="url(#fullPageRayGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    transform={`rotate(${deg} 250 250)`}
                  />
                ))}
              </svg>
            </div>
          ) : (
            <div className="full-page-moon-glow">
              <div className="moon-radial-halo" />
              <div className="moon-crescent-orb" />
            </div>
          )}
        </>
      )}

      {/* 4. OVERCAST SKY BLANKET: Overcast (code 3) and Thunderstorm (95,96,99) */}
      {(isOvercast || isStorm) && (
        <div className={`full-page-overcast-blanket ${theme === 'dark' ? 'blanket-dark' : 'blanket-light'}`} />
      )}

      {/* 5. FOG / MIST OVERLAY: Fog (codes 45, 48) */}
      {isFog && (
        <div className={`full-page-fog-overlay ${theme === 'dark' ? 'fog-dark' : 'fog-light'}`}>
          <div className="fog-layer fog-layer-1" />
          <div className="fog-layer fog-layer-2" />
        </div>
      )}

      {/* 6. DRIFTING CLOUDS: Rendered in BOTH Light and Dark Modes */}
      {/* - Clear (0, 1): NO clouds */}
      {/* - Partly Cloudy (2): 3 distinct drifting clouds with starfield/sky visible */}
      {/* - Overcast (3), Rain, Storm: All 5 dense clouds with heavy overcast sky */}
      {(isPartlyCloudy || isOvercast || isRain || isStorm || isDrizzle) && (
        <div
          className={`full-page-clouds ${theme === 'dark' ? 'night-clouds' : 'day-clouds'}`}
          style={{
            opacity: isPartlyCloudy ? (theme === 'dark' ? 0.72 : 0.80) : (theme === 'dark' ? 0.92 : 0.95),
          }}
        >
          {/* Cloud 1 */}
          <div className="full-page-cloud cloud-speed-1 cloud-pos-1">
            <svg viewBox="0 0 180 75" className="cloud-svg">
              <path
                d="M 30 60 A 22 22 0 0 1 52 38 A 34 34 0 0 1 108 28 A 28 28 0 0 1 152 50 A 20 20 0 0 1 146 60 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Cloud 2 */}
          <div className="full-page-cloud cloud-speed-2 cloud-pos-2">
            <svg viewBox="0 0 220 85" className="cloud-svg">
              <path
                d="M 35 70 A 25 25 0 0 1 60 48 A 40 40 0 0 1 135 35 A 32 32 0 0 1 185 58 A 24 24 0 0 1 180 70 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Cloud 3 */}
          <div className="full-page-cloud cloud-speed-3 cloud-pos-3">
            <svg viewBox="0 0 160 65" className="cloud-svg">
              <path
                d="M 25 52 A 18 18 0 0 1 44 34 A 30 30 0 0 1 95 24 A 25 25 0 0 1 135 42 A 18 18 0 0 1 130 52 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Clouds 4 & 5 (Heavy cloud deck: Overcast, Rain, Storm) */}
          {(isOvercast || isRain || isStorm || isDrizzle) && (
            <>
              <div className="full-page-cloud cloud-speed-4 cloud-pos-4">
                <svg viewBox="0 0 200 80" className="cloud-svg">
                  <path
                    d="M 32 66 A 24 24 0 0 1 56 44 A 38 38 0 0 1 125 32 A 30 30 0 0 1 170 54 A 22 22 0 0 1 165 66 Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <div className="full-page-cloud cloud-speed-5 cloud-pos-5">
                <svg viewBox="0 0 170 70" className="cloud-svg">
                  <path
                    d="M 28 56 A 20 20 0 0 1 48 36 A 32 32 0 0 1 102 26 A 26 26 0 0 1 144 46 A 19 19 0 0 1 140 56 Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </>
          )}
        </div>
      )}

      {/* 7. Full-Viewport Canvas Particle System (Rain, Drizzle, Snow, Thunderstorm) */}
      {(isDrizzle || isRain || isSnow || isStorm) && (
        <canvas ref={canvasRef} className="full-page-particle-canvas" />
      )}
    </div>
  );
}
