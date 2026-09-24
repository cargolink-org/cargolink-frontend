import { refreshNotifications } from './notifications';
import { getNotifications } from '../api/notifications';
import { useNotificationStore } from '../state/notificationStore';
import type { Notification } from '../state/types';

jest.mock('../api/notifications');

const sample: Notification[] = [
  { id: 'n1', type: 'booking_confirmation', message: 'Booked.', sent_at: '2026-09-01T00:00:00Z', read: true },
  { id: 'n2', type: 'delay_alert', message: 'Delayed.', sent_at: '2026-09-02T00:00:00Z', read: false },
];

describe('refreshNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({ items: [], unreadCount: 0 });
  });

  it('fetches notifications and syncs them into notificationStore', async () => {
    (getNotifications as jest.Mock).mockResolvedValue(sample);

    const result = await refreshNotifications();

    expect(result).toEqual(sample);
    expect(useNotificationStore.getState().items).toEqual(sample);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('propagates a fetch failure rather than swallowing it', async () => {
    (getNotifications as jest.Mock).mockRejectedValue(new Error('network error'));

    await expect(refreshNotifications()).rejects.toThrow('network error');
    // Store is left untouched on failure — caller decides how to surface it.
    expect(useNotificationStore.getState().items).toEqual([]);
  });
});
