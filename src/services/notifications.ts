/**
 * notifications.ts
 *
 * Task F.2 — notification-list refresh lifecycle.
 *
 * SCOPE NOTE (read before extending this file): the Frontend
 * Implementation Guide's own category description for `services/` names
 * "push/local notification handling" as the pattern this file's sibling
 * (`services/sockets.ts`, `services/location.ts`) follow — a genuine
 * device-level integration, not a REST call. That is almost certainly
 * what this file was originally meant to cover. It does NOT do that here.
 * Reasons:
 *   1. No source document (source doc, technical spec, execution plan)
 *      specifies ANY mobile push-notification requirement. Module 4.7
 *      names only server-triggered SMS/email (MSG91/Gupshup, SendGrid) —
 *      never a push channel or an Expo push token.
 *   2. No push library (`expo-notifications` or similar) is installed.
 *      Adding one would be a new native-dependency decision with its own
 *      permission/config implications — the same class of decision
 *      Cluster E's `@rnmapbox/maps` and `expo-location` entries each got
 *      individually, explicitly called out for. Silently adding it here
 *      would be scope creep this task never asked for.
 * If push notifications become a real requirement later, that's new
 * scope for a future task, not a silent addition to this one.
 *
 * What this file DOES do: centralizes "fetch the notification list and
 * sync it into notificationStore" as a single function, since — unlike
 * most REST calls in this codebase, which a single screen calls directly
 * from its own `api/*.ts` import — a notification refresh has more than
 * one natural call site (the inbox screen itself on mount/focus, and any
 * future badge-polling from a Home screen or tab bar once Cluster H adds
 * one). Centralizing here means every caller stays in sync on the same
 * fetch-then-store-update behavior rather than each duplicating it.
 */

import { getNotifications } from '../api/notifications';
import { useNotificationStore } from '../state/notificationStore';

/**
 * Fetches the current notification list and syncs it into
 * `notificationStore`. Returns the fetched list so a caller that also
 * wants to branch on success/failure locally (e.g. to show a screen-level
 * error state) doesn't have to re-read the store immediately after.
 */
export async function refreshNotifications() {
  const items = await getNotifications();
  useNotificationStore.getState().setItems(items);
  return items;
}
