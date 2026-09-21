import React from 'react';

/**
 * WaterDroplets
 * Subtle sliding water condensation droplets on card surfaces when period has significant rain.
 */
export default function WaterDroplets({ isPlaying = true }) {
  const droplets = [
    { left: '14%', delay: '0.4s', duration: '9s', size: '3px' },
    { left: '38%', delay: '3.2s', duration: '11s', size: '2.5px' },
    { left: '62%', delay: '1.6s', duration: '8.5s', size: '3.5px' },
    { left: '85%', delay: '4.8s', duration: '10s', size: '2px' },
  ];

  return (
    <div className={`water-droplets-overlay ${isPlaying ? 'playing' : 'paused'}`} aria-hidden="true">
      {droplets.map((d, i) => (
        <div
          key={i}
          className="water-droplet-bead"
          style={{
            left: d.left,
            width: d.size,
            height: `${parseFloat(d.size) * 1.8}px`,
            animationDelay: d.delay,
            animationDuration: d.duration,
          }}
        />
      ))}
    </div>
  );
}
