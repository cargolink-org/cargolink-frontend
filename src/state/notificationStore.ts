// src/state/notificationStore.ts
//
// notificationStore — in-app notification list + derived unread count.
// `unreadCount` is always derived from `items` rather than tracked
// independently, so the two can never drift out of sync.
//
// Note: full pagination/virtualization is a Cluster F concern, but this
// store deliberately avoids any design choice that would force loading
// the full notification history at once later (e.g., no assumption that
// `items` is ever spread into a fixed-size array).

import { create } from 'zustand';
import type { Notification, NotificationPreferences } from './types';

interface NotificationState {
  unreadCount: number;
  items: Notification[];

  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  setItems: (items: Notification[]) => void;
  clearAll: () => void;

  // --- Task F.2 — fetch status for `items`, same parity as
  // `isLoadingPreferences`/`preferencesError` below, so NotificationInboxScreen
  // can show its own loading/retry-error state consistently with F.1's
  // established screen pattern. ---
  isLoadingItems: boolean;
  itemsError: string | null;
  setItemsLoading: (loading: boolean) => void;
  setItemsError: (error: string | null) => void;

  // --- Task F.2 — preferences state. Kept in the same store as the
  // inbox items (rather than a new store) since both are simple,
  // low-traffic, closely-related notification concerns owned by one
  // screen pair. `preferences` is `null` until the first successful
  // fetch; `undefined` is never used here (unlike loadStore's F.1
  // per-loadId maps) since there is exactly one preferences object per
  // signed-in user, not one per keyed entity. ---
  preferences: NotificationPreferences | null;
  isLoadingPreferences: boolean;
  preferencesError: string | null;
  setPreferences: (preferences: NotificationPreferences) => void;
  setPreferencesLoading: (loading: boolean) => void;
  setPreferencesError: (error: string | null) => void;
}

const deriveUnread = (items: Notification[]) => items.filter((n) => !n.read).length;

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  items: [],

  addNotification: (notification) =>
    set((s) => {
      const items = [notification, ...s.items];
      return { items, unreadCount: deriveUnread(items) };
    }),

  markRead: (id) =>
    set((s) => {
      const items = s.items.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { items, unreadCount: deriveUnread(items) };
    }),

  setItems: (items) => set({ items, unreadCount: deriveUnread(items), isLoadingItems: false, itemsError: null }),

  clearAll: () => set({ items: [], unreadCount: 0 }),

  isLoadingItems: false,
  itemsError: null,
  setItemsLoading: (isLoadingItems) => set({ isLoadingItems }),
  setItemsError: (itemsError) => set({ itemsError, isLoadingItems: false }),

  // --- Task F.2 — preferences actions ---
  preferences: null,
  isLoadingPreferences: false,
  preferencesError: null,
  setPreferences: (preferences) =>
    set({ preferences, isLoadingPreferences: false, preferencesError: null }),
  setPreferencesLoading: (isLoadingPreferences) => set({ isLoadingPreferences }),
  setPreferencesError: (preferencesError) =>
    set({ preferencesError, isLoadingPreferences: false }),
}));

// Fine-grained selector hooks.
export const useUnreadCount = () => useNotificationStore((s) => s.unreadCount);
export const useNotificationItems = () => useNotificationStore((s) => s.items);
export const useIsLoadingItems = () => useNotificationStore((s) => s.isLoadingItems);
export const useItemsError = () => useNotificationStore((s) => s.itemsError);
export const useNotificationPreferences = () => useNotificationStore((s) => s.preferences);
export const useIsLoadingPreferences = () =>
  useNotificationStore((s) => s.isLoadingPreferences);
export const usePreferencesError = () => useNotificationStore((s) => s.preferencesError);
