import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NotificationInboxScreen from '../../../src/screens/shared/NotificationInboxScreen';
import { markNotificationRead } from '../../../src/api/notifications';
import { refreshNotifications } from '../../../src/services/notifications';
import { useNotificationStore } from '../../../src/state/notificationStore';
import type { Notification } from '../../../src/state/types';

jest.mock('../../../src/api/notifications');
jest.mock('../../../src/services/notifications');

const sample: Notification[] = [
  { id: 'n1', type: 'delay_alert', message: 'LD-1042 is running late.', sent_at: '2026-09-20T14:05:00Z', read: false },
  { id: 'n2', type: 'booking_confirmation', message: 'LD-1030 booked.', sent_at: '2026-09-18T09:00:00Z', read: true },
];

describe('NotificationInboxScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({
      items: [],
      unreadCount: 0,
      isLoadingItems: false,
      itemsError: null,
    });
  });

  it('renders notifications with unread ones visually distinguished by more than color', async () => {
    (refreshNotifications as jest.Mock).mockImplementation(async () => {
      useNotificationStore.getState().setItems(sample);
      return sample;
    });

    render(<NotificationInboxScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('notification-row-n1')).toBeTruthy();
    });
    // Unread (n1): dot + "Unread" text label present — not color alone.
    expect(screen.getByTestId('unread-dot-n1')).toBeTruthy();
    expect(screen.getByTestId('unread-label-n1')).toBeTruthy();
    // Read (n2): neither present.
    expect(screen.queryByTestId('unread-dot-n2')).toBeNull();
    expect(screen.queryByTestId('unread-label-n2')).toBeNull();
  });

  it('shows the empty state when there are no notifications', async () => {
    (refreshNotifications as jest.Mock).mockImplementation(async () => {
      useNotificationStore.getState().setItems([]);
      return [];
    });

    render(<NotificationInboxScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('notification-inbox-empty')).toBeTruthy();
    });
  });

  it('marks an unread notification as read when pressed, updating the badge-driving store', async () => {
    (refreshNotifications as jest.Mock).mockImplementation(async () => {
      useNotificationStore.getState().setItems(sample);
      return sample;
    });
    (markNotificationRead as jest.Mock).mockResolvedValue({ id: 'n1', read: true });

    render(<NotificationInboxScreen />);

    await waitFor(() => screen.getByTestId('notification-row-n1'));
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    fireEvent.press(screen.getByTestId('notification-row-n1'));

    await waitFor(() => {
      expect(markNotificationRead).toHaveBeenCalledWith('n1');
    });
    await waitFor(() => {
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
    expect(screen.queryByTestId('unread-dot-n1')).toBeNull();
  });

  it('does not re-call mark-read for an already-read notification', async () => {
    (refreshNotifications as jest.Mock).mockImplementation(async () => {
      useNotificationStore.getState().setItems(sample);
      return sample;
    });

    render(<NotificationInboxScreen />);
    await waitFor(() => screen.getByTestId('notification-row-n2'));

    fireEvent.press(screen.getByTestId('notification-row-n2'));

    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it('shows a retry-capable error state when the fetch fails', async () => {
    (refreshNotifications as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<NotificationInboxScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('notification-inbox-error')).toBeTruthy();
    });
    expect(screen.getByTestId('notification-inbox-retry-button')).toBeTruthy();
  });
});
