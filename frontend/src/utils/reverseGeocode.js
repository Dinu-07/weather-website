import axios from 'axios';

/**
 * Reverse-geocodes coordinates using BigDataCloud reverse geocode client API.
 *
 * Returns a display name string: "Locality, Region, Country"
 * Falls back to "Your location (lat, lon)" on failure.
 *
 * Name priority: locality > city > principalSubdivision
 */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await axios.get(
      'https://api.bigdatacloud.net/data/reverse-geocode-client',
      {
        params: {
          latitude: lat,
          longitude: lon,
          localityLanguage: 'en',
        },
        timeout: 8000,
      }
    );

    const data = res.data;
    if (!data) {
      return `Your location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
    }

    // Priority: locality > city > principalSubdivision
    const primaryName =
      data.locality ||
      data.city ||
      data.principalSubdivision ||
      '';

    const region =
      data.principalSubdivision && data.principalSubdivision !== primaryName
        ? data.principalSubdivision
        : '';

    const country =
      data.countryName &&
      data.countryName !== primaryName &&
      data.countryName !== region
        ? data.countryName
        : !primaryName
        ? data.countryName || ''
        : '';

    const parts = [primaryName, region, country].filter(Boolean);
    return parts.length > 0
      ? parts.join(', ')
      : `Your location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
  } catch {
    return `Your location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
  }
}
