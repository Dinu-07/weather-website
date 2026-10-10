import axios from 'axios';

/**
 * Reverse-geocodes coordinates using BigDataCloud reverse geocode client API.
 * Formats the result as "City, Region, Country" (or "Your location (lat, lon)" on failure).
 */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await axios.get('https://api.bigdatacloud.net/data/reverse-geocode-client', {
      params: {
        latitude: lat,
        longitude: lon,
        localityLanguage: 'en',
      },
      timeout: 8000,
    });

    const data = res.data;
    if (!data) {
      return `Your location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
    }

    const primaryName = data.city || data.locality || data.principalSubdivision || '';
    const subdivision =
      data.principalSubdivision && data.principalSubdivision !== primaryName
        ? data.principalSubdivision
        : '';
    const country =
      data.countryName && data.countryName !== primaryName && data.countryName !== subdivision
        ? data.countryName
        : !primaryName
          ? data.countryName || ''
          : '';

    const parts = [primaryName, subdivision, country].filter(Boolean);
    return parts.length > 0
      ? parts.join(', ')
      : `Your location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
  } catch (err) {
    console.warn('Reverse geocode failed, falling back to coordinate label:', err);
    return `Your location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
  }
}
