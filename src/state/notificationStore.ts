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
import type { Notification } from './types';

interface NotificationState {
  unreadCount: number;
  items: Notification[];

  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  setItems: (items: Notification[]) => void;
  clearAll: () => void;
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

  setItems: (items) => set({ items, unreadCount: deriveUnread(items) }),

  clearAll: () => set({ items: [], unreadCount: 0 }),
}));

// Fine-grained selector hooks.
export const useUnreadCount = () => useNotificationStore((s) => s.unreadCount);
export const useNotificationItems = () => useNotificationStore((s) => s.items);
