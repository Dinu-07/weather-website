"""
Resilience and Caching Layer for Open-Meteo Requests
Provides:
- Shared HTTP client with timeout, exponential backoff + jitter, and Retry-After support.
- Upstream error translation (429 -> 503, others -> 502) with friendly user messages.
- Thread-safe in-memory TTL Cache with LRU size cap (500 items).
- Stale-while-error fallback (up to 1 hour old) with "stale": true.
"""

import logging
import random
import threading
import time
from collections import OrderedDict
from typing import Any, Callable, Dict, Optional, Tuple

import requests

logger = logging.getLogger("weather_resilience")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class UpstreamError(Exception):
    """Base exception for upstream Open-Meteo failures."""
    def __init__(self, status_code: int, detail: str = ""):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail or f"Upstream error ({status_code})")


class UpstreamRateLimitError(UpstreamError):
    """Raised when Open-Meteo returns HTTP 429 Too Many Requests."""
    def __init__(self, detail: str = "Upstream rate limit exceeded"):
        super().__init__(status_code=503, detail=detail)


class UpstreamServiceError(UpstreamError):
    """Raised when Open-Meteo fails or returns 5xx/network errors."""
    def __init__(self, detail: str = "Upstream service unavailable"):
        super().__init__(status_code=502, detail=detail)


def open_meteo_request(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: float = 10.0,
    max_retries: int = 3,
) -> requests.Response:
    """
    Perform an HTTP GET request to Open-Meteo with:
    - 10s timeout
    - Up to 3 retries on 429, 500, 502, 503, 504 and transient network/timeout errors
    - Exponential backoff (1s, 2s, 4s) plus random jitter
    - Honoring Retry-After header (capped at 5s)

    Raises
    ------
    UpstreamRateLimitError
        When upstream returns 429 and retries are exhausted.
    UpstreamServiceError
        When upstream returns 5xx or network errors and retries are exhausted.
    """
    retryable_statuses = {429, 500, 502, 503, 504}
    last_response: Optional[requests.Response] = None
    last_exception: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.status_code == 200:
                return resp

            last_response = resp
            if resp.status_code in retryable_statuses:
                if attempt < max_retries:
                    # Determine delay: check Retry-After header first (capped at 5s)
                    retry_after = resp.headers.get("Retry-After")
                    delay = None
                    if retry_after:
                        try:
                            delay = min(max(0.1, float(retry_after)), 5.0)
                        except (ValueError, TypeError):
                            delay = None

                    if delay is None:
                        # Exponential backoff: 1s, 2s, 4s + jitter (0.1 to 0.5s)
                        base_backoff = 1.0 * (2 ** attempt)
                        jitter = random.uniform(0.1, 0.5)
                        delay = min(base_backoff + jitter, 5.0)

                    logger.warning(
                        f"Open-Meteo returned status {resp.status_code} for {url}. "
                        f"Retrying in {delay:.2f}s (attempt {attempt + 1}/{max_retries})..."
                    )
                    time.sleep(delay)
                    continue
                else:
                    break
            else:
                # Non-retryable client error (e.g., 400 bad query)
                logger.error(
                    f"Open-Meteo returned non-retryable client error {resp.status_code} for {url}. "
                    f"Response: {resp.text[:200]}"
                )
                raise UpstreamServiceError(f"Upstream returned status {resp.status_code}")

        except requests.RequestException as exc:
            last_exception = exc
            if attempt < max_retries:
                base_backoff = 1.0 * (2 ** attempt)
                jitter = random.uniform(0.1, 0.5)
                delay = min(base_backoff + jitter, 5.0)
                logger.warning(
                    f"Open-Meteo connection error ({type(exc).__name__}) for {url}. "
                    f"Retrying in {delay:.2f}s (attempt {attempt + 1}/{max_retries})..."
                )
                time.sleep(delay)
                continue
            else:
                break

    # If we reached here, retries have been exhausted
    if last_response is not None:
        if last_response.status_code == 429:
            logger.error(f"Open-Meteo 429 rate limit exhausted for {url} with params {params}")
            raise UpstreamRateLimitError("Upstream rate limit reached")
        else:
            logger.error(f"Open-Meteo upstream error {last_response.status_code} for {url} with params {params}")
            raise UpstreamServiceError(f"Upstream error {last_response.status_code}")
    else:
        logger.error(f"Open-Meteo network failure for {url} with params {params}: {last_exception}")
        raise UpstreamServiceError("Upstream network connection failed")


class TTLCache:
    """
    Thread-safe in-memory cache with TTL and LRU-style size cap (500 items).
    Supports retrieving stale values up to max_stale_age (e.g. 1 hour).
    """
    def __init__(self, maxsize: int = 500):
        self.maxsize = maxsize
        self._cache: OrderedDict[Any, Dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Any) -> Tuple[Optional[Any], bool, float]:
        """
        Returns (data, is_fresh, created_at).
        If key not present, returns (None, False, 0.0).
        """
        with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None, False, 0.0
            now = time.time()
            is_fresh = now <= entry["expires_at"]
            self._cache.move_to_end(key)
            return entry["data"], is_fresh, entry["created_at"]

    def get_stale(self, key: Any, max_stale_age: float = 3600.0) -> Optional[Any]:
        """
        Returns cached data if present and created within max_stale_age seconds,
        regardless of whether it has expired.
        """
        with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None
            now = time.time()
            if (now - entry["created_at"]) <= max_stale_age:
                self._cache.move_to_end(key)
                return entry["data"]
            return None

    def set(self, key: Any, data: Any, ttl_seconds: float) -> None:
        """
        Store data with TTL. Evicts oldest entry if size exceeds maxsize.
        """
        with self._lock:
            now = time.time()
            self._cache[key] = {
                "data": data,
                "expires_at": now + ttl_seconds,
                "created_at": now,
            }
            self._cache.move_to_end(key)
            while len(self._cache) > self.maxsize:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# Global in-memory cache shared across backend endpoints
global_cache = TTLCache(maxsize=500)


def cached_open_meteo_call(
    cache_key: Any,
    ttl_seconds: float,
    fetch_fn: Callable[[], Any],
    max_stale_age: float = 3600.0,
) -> Any:
    """
    Executes fetch_fn with TTL cache.
    If upstream raises UpstreamError and stale data (<= max_stale_age) exists,
    returns stale data marked with "stale": True.
    """
    data, is_fresh, _ = global_cache.get(cache_key)
    if data is not None and is_fresh:
        return data

    try:
        fresh_data = fetch_fn()
        global_cache.set(cache_key, fresh_data, ttl_seconds)
        return fresh_data
    except (UpstreamRateLimitError, UpstreamServiceError) as exc:
        stale_data = global_cache.get_stale(cache_key, max_stale_age=max_stale_age)
        if stale_data is not None:
            logger.warning(f"Upstream request failed ({type(exc).__name__}). Serving stale cached data for {cache_key}.")
            if isinstance(stale_data, dict):
                return {**stale_data, "stale": True}
            elif hasattr(stale_data, "copy") and hasattr(stale_data, "attrs"):
                # Handles pandas DataFrame
                stale_copy = stale_data.copy()
                stale_copy.attrs["stale"] = True
                return stale_copy
            return stale_data
        raise
