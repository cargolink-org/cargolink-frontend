/**
 * Isolated Mapbox geocoding helper (task D.1).
 *
 * This is the ONE place outside `api/loads.ts` allowed to make a direct
 * network call (per the task's Code Quality Requirements) — `LocationPicker`
 * calls into this module rather than calling `fetch` inline. It talks to
 * Mapbox's Geocoding API directly (not through the CargoLink backend),
 * since address search is a client-side Mapbox SDK concern per the
 * technical spec (§2.1: Mapbox SDK is the confirmed client-side maps
 * provider), not something the backend proxies.
 *
 * Full `@rnmapbox/maps` pin-drop-on-map integration is deliberately out of
 * scope here — task D.1 explicitly scopes `LocationPicker` as search-driven
 * only for now, reserving the native map risk area for Cluster E's
 * dedicated performance spike.
 */

export interface GeocodeResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const MAPBOX_GEOCODING_BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/**
 * MOCK_MODE mirrors the convention used across `api/vehicles.ts` and
 * `api/documents.ts` — re-derived from the env var here until a shared
 * `src/config/env.ts` exists as the single source of truth (see those
 * files' matching notes).
 */
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

const MOCK_RESULTS: GeocodeResult[] = [
  { id: 'mock-1', label: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567 },
  { id: 'mock-2', label: 'Mumbai, Maharashtra, India', lat: 19.076, lng: 72.8777 },
  { id: 'mock-3', label: 'Nashik, Maharashtra, India', lat: 19.9975, lng: 73.7898 },
];

function mockSearchPlaces(query: string): Promise<GeocodeResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(q ? MOCK_RESULTS.filter((r) => r.label.toLowerCase().includes(q)) : []);
    }, 200);
  });
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

/**
 * Searches for places matching `query`. Returns an empty array (not an
 * error) both when there are genuinely no matches and — deliberately, so
 * the UI's "no results" state and a silent transient failure don't need to
 * be told apart by the caller — is left to throw for hard failures (no
 * token configured, network error) so `LocationPicker` can distinguish
 * "no matches" from "search failed" and message each correctly.
 */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  if (MOCK_MODE) {
    return mockSearchPlaces(query);
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Mapbox access token is not configured (EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN).');
  }

  const url = `${MAPBOX_GEOCODING_BASE_URL}/${encodeURIComponent(trimmed)}.json?access_token=${accessToken}&limit=5&country=IN`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding search failed (${response.status}).`);
  }

  const data: MapboxGeocodingResponse = await response.json();
  return data.features.map((feature) => ({
    id: feature.id,
    label: feature.place_name,
    lat: feature.center[1],
    lng: feature.center[0],
  }));
}
