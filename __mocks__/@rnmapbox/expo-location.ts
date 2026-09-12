/**
 * Jest manual mock for `expo-location` (Task E.2).
 *
 * Same reasoning as `__mocks__/expo-task-manager.ts` — real GPS/permission
 * APIs can't run in Jest regardless of install state, and this must be
 * safe to import transitively (via `services/location.ts`) from screen
 * tests that never reference `expo-location` directly themselves (e.g.
 * `TrackingScreen.test.tsx`).
 *
 * Defaults are the PERMISSIVE case (all permissions granted, no
 * in-flight task) so screen-level tests aren't forced to configure this
 * mock just to render. `location.test.ts` overrides individual methods
 * per-test (via `mockResolvedValueOnce`/`mockResolvedValue`) to exercise
 * the denied/revoked/error paths — using `jest.clearAllMocks()` (not
 * `resetAllMocks()`) between tests so these defaults survive unless a
 * specific test overrides them, matching the convention noted in
 * `location.test.ts`.
 */

export enum Accuracy {
  Lowest = 1,
  Low = 2,
  Balanced = 3,
  High = 4,
  Highest = 5,
  BestForNavigation = 6,
}

const GRANTED = { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };

export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue(GRANTED);
export const requestBackgroundPermissionsAsync = jest.fn().mockResolvedValue(GRANTED);
export const getForegroundPermissionsAsync = jest.fn().mockResolvedValue(GRANTED);
export const getBackgroundPermissionsAsync = jest.fn().mockResolvedValue(GRANTED);
export const hasServicesEnabledAsync = jest.fn().mockResolvedValue(true);
export const startLocationUpdatesAsync = jest.fn().mockResolvedValue(undefined);
export const stopLocationUpdatesAsync = jest.fn().mockResolvedValue(undefined);
export const hasStartedLocationUpdatesAsync = jest.fn().mockResolvedValue(false);

export default {
  Accuracy,
  requestForegroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  getForegroundPermissionsAsync,
  getBackgroundPermissionsAsync,
  hasServicesEnabledAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  hasStartedLocationUpdatesAsync,
};
