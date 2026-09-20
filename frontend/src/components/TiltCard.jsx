import React from 'react';

/**
 * WeatherCard container providing clean, calm Google Weather-inspired card elevation.
 * Neutralized from previous 3D tilt/glare to adhere to flat design specifications.
 */
export default function TiltCard({ children, className = '', style = {} }) {
  return (
    <div className={`weather-card ${className}`} style={style}>
      {children}
    </div>
  );
}
