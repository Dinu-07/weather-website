/**
 * useHighAccuracyGeo
 *
 * Calls navigator.geolocation.watchPosition with { enableHighAccuracy: true,
 * timeout: 15000, maximumAge: 0 } and runs for up to 12 seconds, resolving
 * with the reading that has the smallest coords.accuracy.  Stops early (via
 * clearWatch) as soon as accuracy <= 1000 m.  Falls back to the best reading
 * after 12 seconds even if accuracy is still coarse; if no reading arrives at
 * all, the timeout fires at 15 seconds (the browser's own timeout) or the
 * outer 15-second guard, whichever is first.
 *
 * Returns a Promise that resolves with { lat, lon, accuracy } or rejects with
 * a GeolocationPositionError.  Accepts an AbortSignal so callers can cancel.
 */
export function getHighAccuracyPosition(signal) {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const GEO_OPTIONS = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    const WATCH_DURATION_MS  = 12000;  // collect for up to 12 s
    const OUTER_GUARD_MS     = 15000;  // hard outer limit
    const GOOD_ACCURACY_M    = 1000;   // stop early threshold

    let watchId           = null;
    let watchTimer        = null;
    let outerTimer        = null;
    let bestPosition      = null;
    let finished          = false;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (watchTimer)  clearTimeout(watchTimer);
      if (outerTimer)  clearTimeout(outerTimer);
      watchId = null;
      watchTimer = null;
      outerTimer = null;
    };

    const finish = (pos) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve({
        lat:      pos.coords.latitude,
        lon:      pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    };

    const fail = (err) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (bestPosition) {
        // At least return the best reading we got before the error
        resolve({
          lat:      bestPosition.coords.latitude,
          lon:      bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
        });
      } else {
        reject(err);
      }
    };

    // Hard outer guard — resolves with best so far or rejects
    outerTimer = setTimeout(() => {
      if (finished) return;
      if (bestPosition) {
        finish(bestPosition);
      } else {
        fail(new Error('Geolocation timed out with no reading'));
      }
    }, OUTER_GUARD_MS);

    // 12-second window timer — use best reading collected so far
    watchTimer = setTimeout(() => {
      if (finished) return;
      if (bestPosition) {
        finish(bestPosition);
      }
      // else wait for outerTimer or next watch callback
    }, WATCH_DURATION_MS);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (finished) return;
        if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = pos;
        }
        // Stop early if accuracy is good enough
        if (pos.coords.accuracy <= GOOD_ACCURACY_M) {
          finish(bestPosition);
        }
      },
      (err) => {
        fail(err);
      },
      GEO_OPTIONS
    );

    // AbortSignal support: cancel the watch if the caller cancels
    if (signal) {
      if (signal.aborted) {
        fail(new Error('Aborted'));
      } else {
        signal.addEventListener('abort', () => fail(new Error('Aborted')));
      }
    }
  });
}
