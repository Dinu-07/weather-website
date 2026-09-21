import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp Hook
 * Smoothly animates a numeric value from 0 (or previous value) to targetValue using requestAnimationFrame
 * and an ease-out cubic curve.
 *
 * @param {number|null} targetValue The end value to animate to
 * @param {number} duration Duration in ms (default 800ms)
 * @param {number} decimals Number of decimal places to format (default 1)
 * @returns {string|number|null} Animated formatted string or null if targetValue is null
 */
export function useCountUp(targetValue, duration = 800, decimals = 1) {
  const [currentValue, setCurrentValue] = useState(0);
  const prevValueRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (targetValue === null || targetValue === undefined || isNaN(targetValue)) {
      return;
    }

    // Check prefers-reduced-motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setCurrentValue(targetValue);
      prevValueRef.current = targetValue;
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = Number(targetValue);
    const change = endVal - startVal;
    let startTime = null;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      const val = startVal + change * eased;

      setCurrentValue(val);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
        setCurrentValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration]);

  if (targetValue === null || targetValue === undefined || isNaN(targetValue)) {
    return null;
  }

  return decimals === 0 ? Math.round(currentValue) : currentValue.toFixed(decimals);
}
