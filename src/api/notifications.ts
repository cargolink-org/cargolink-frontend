// src/api/notifications.ts
//
// Task F.2 — notification inbox + preferences REST calls.
//
// ASSUMPTION (flag for review at contract freeze — the largest open
// contract item in task F.2): the technical spec's §5 "Core API
// Endpoints" list has NO entries for notifications at all — not a list
// endpoint, not a mark-read endpoint, not a preferences endpoint —
// despite the `notifications` table existing in the schema (§4) and this
// task's own spec requiring all three. Module 4.7 describes only the
// SERVER-triggered SMS/email side (Twilio/MSG91/Gupshup/SendGrid), never
// an in-app REST surface. Every route below is inferred, not confirmed:
//   - `GET /notifications`               — list the signed-in user's notifications
//   - `POST /notifications/{id}/read`    — mark one notification read
//   - `GET /notifications/preferences`   — fetch channel preferences
//   - `PUT /notifications/preferences`   — replace channel preferences
// Flag all four with Dinesh before wiring this to a real backend — see
// `state/types.ts`'s `Notification` doc comment for the related `read`/
// `read_at` schema-column gap.

import { apiClient } from './client';
import type {
  Notification,
  NotificationPreferences,
  NotificationType,
} from '../state/types';
import { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } from '../state/types';

const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

function mockNotificationFixture(): Notification[] {
  return [
    {
      id: 'notif-1',
      type: 'booking_confirmation',
      message: 'Your load LD-1042 has been booked with a transporter.',
      sent_at: '2026-09-18T09:12:00Z',
      read: true,
    },
    {
      id: 'notif-2',
      type: 'pickup_confirmation',
      message: 'Pickup confirmed for LD-1042 at the origin warehouse.',
      sent_at: '2026-09-19T07:40:00Z',
      read: true,
    },
    {
      id: 'notif-3',
      type: 'delay_alert',
      message: 'LD-1042 is running behind its estimated arrival time.',
      sent_at: '2026-09-20T14:05:00Z',
      read: false,
    },
    {
      id: 'notif-4',
      type: 'delivery_confirmation',
      message: 'LD-1039 was delivered and is awaiting your rating.',
      sent_at: '2026-09-21T11:30:00Z',
      read: false,
    },
  ];
}

function defaultPreferences(): NotificationPreferences {
  // All channels on by default — a reasonable, conservative starting
  // point pending Dinesh's confirmation of whatever default the real
  // backend applies for a newly-created preferences row.
  const prefs = {} as NotificationPreferences;
  for (const type of NOTIFICATION_TYPES) {
    prefs[type] = {} as NotificationPreferences[NotificationType];
    for (const channel of NOTIFICATION_CHANNELS) {
      prefs[type][channel] = true;
    }
  }
  return prefs;
}

function mockGetNotifications(): Promise<Notification[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockNotificationFixture()), 500);
  });
}

function mockMarkRead(id: string): Promise<{ id: string; read: boolean }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id, read: true }), 300);
  });
}

let mockPreferencesState: NotificationPreferences | null = null;

function mockGetPreferences(): Promise<NotificationPreferences> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!mockPreferencesState) {
        mockPreferencesState = defaultPreferences();
      }
      resolve(mockPreferencesState);
    }, 400);
  });
}

function mockUpdatePreferences(
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockPreferencesState = preferences;
      resolve(preferences);
    }, 400);
  });
}

export async function getNotifications(): Promise<Notification[]> {
  if (MOCK_MODE) {
    return mockGetNotifications();
  }

  const { data } = await apiClient.get<Notification[]>('/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<{ id: string; read: boolean }> {
  if (MOCK_MODE) {
    return mockMarkRead(id);
  }

  const { data } = await apiClient.post<{ id: string; read: boolean }>(
    `/notifications/${id}/read`
  );
  return data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  if (MOCK_MODE) {
    return mockGetPreferences();
  }

  const { data } = await apiClient.get<NotificationPreferences>('/notifications/preferences');
  return data;
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  if (MOCK_MODE) {
    return mockUpdatePreferences(preferences);
  }

  const { data } = await apiClient.put<NotificationPreferences>(
    '/notifications/preferences',
    preferences
  );
  return data;
}
