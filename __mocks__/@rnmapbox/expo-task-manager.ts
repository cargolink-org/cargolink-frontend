/**
 * Jest manual mock for `expo-task-manager` (Task E.2).
 *
 * Real background-task registration can't run in the Jest environment —
 * there's no native TaskManager bridge, regardless of whether the real
 * package is installed. `defineTask` must still be safe to call, because
 * `services/location.ts` calls it as a required, top-level module-load
 * side effect (per Expo's background-task API — tasks must be defined
 * outside of component/render lifecycles). Without this mock, importing
 * `location.ts` would throw in ANY test file that transitively imports
 * it — not just `location.test.ts` itself, but also e.g.
 * `TrackingScreen.test.tsx`, which imports the transporter screen that
 * now wires up Start/End Trip controls.
 *
 * `location.test.ts` reads `defineTask`'s captured call arguments
 * (`(defineTask as jest.Mock).mock.calls[0][1]`) to obtain the real task
 * executor function and invoke it directly — simulating what a real
 * background GPS delivery from the OS would look like, without needing
 * an actual native bridge.
 */

export const defineTask = jest.fn();
export const isTaskRegisteredAsync = jest.fn().mockResolvedValue(false);
export const isTaskDefined = jest.fn().mockReturnValue(true);
export const unregisterTaskAsync = jest.fn().mockResolvedValue(undefined);
export const unregisterAllTasksAsync = jest.fn().mockResolvedValue(undefined);
export const getRegisteredTasksAsync = jest.fn().mockResolvedValue([]);

export default {
  defineTask,
  isTaskRegisteredAsync,
  isTaskDefined,
  unregisterTaskAsync,
  unregisterAllTasksAsync,
  getRegisteredTasksAsync,
};
