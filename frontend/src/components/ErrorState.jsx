import React, { useEffect, useState, useRef } from 'react';

/**
 * Friendly Error State Component with "Try Again" button and 5-second one-time auto-retry.
 */
export default function ErrorState({
  message = 'Weather data is temporarily busy. Please try again shortly.',
  title = null,
  onRetry = null,
  autoRetry = true,
  autoRetrySeconds = 5,
  compact = false,
}) {
  const [retrying, setRetrying] = useState(false);
  const [countdown, setCountdown] = useState(autoRetrySeconds);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const retriedOnceRef = useRef(false);

  useEffect(() => {
    retriedOnceRef.current = false;
    setCountdown(autoRetrySeconds);
  }, [message, autoRetrySeconds]);

  useEffect(() => {
    if (!autoRetry || !onRetry || retriedOnceRef.current) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(async () => {
      retriedOnceRef.current = true;
      setRetrying(true);
      try {
        await Promise.resolve(onRetry());
      } finally {
        setRetrying(false);
      }
    }, autoRetrySeconds * 1000);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [message, autoRetry, autoRetrySeconds, onRetry]);

  const handleManualRetry = async () => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    retriedOnceRef.current = true;
    setCountdown(0);
    setRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className={`error-state-box ${compact ? 'error-state-compact' : ''}`}>
      <span className="error-state-icon" aria-hidden="true">⚠️</span>
      <div className="error-state-content">
        {title && <h4 className="error-state-title">{title}</h4>}
        <p className="error-state-msg">{message}</p>
        {countdown > 0 && !retriedOnceRef.current && (
          <span className="error-state-auto-note">
            Auto-retrying in {countdown}s...
          </span>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          className="error-retry-btn"
          onClick={handleManualRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
}
