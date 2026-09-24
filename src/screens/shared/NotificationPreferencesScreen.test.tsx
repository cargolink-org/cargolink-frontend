import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NotificationPreferencesScreen from '../../../src/screens/shared/NotificationPreferencesScreen';
import { getNotificationPreferences, updateNotificationPreferences } from '../../../src/api/notifications';
import { useNotificationStore } from '../../../src/state/notificationStore';
import type { NotificationPreferences } from '../../../src/state/types';
import { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } from '../../../src/state/types';

jest.mock('../../../src/api/notifications');

function allOn(): NotificationPreferences {
  const prefs = {} as NotificationPreferences;
  for (const type of NOTIFICATION_TYPES) {
    prefs[type] = {} as NotificationPreferences[typeof type];
    for (const channel of NOTIFICATION_CHANNELS) {
      prefs[type][channel] = true;
    }
  }
  return prefs;
}

describe('NotificationPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({
      preferences: null,
      isLoadingPreferences: false,
      preferencesError: null,
    });
  });

  it('renders a toggle for every notification type x channel combination', async () => {
    (getNotificationPreferences as jest.Mock).mockResolvedValue(allOn());

    render(<NotificationPreferencesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('preference-toggle-delay_alert-sms')).toBeTruthy();
    });
    for (const type of NOTIFICATION_TYPES) {
      for (const channel of NOTIFICATION_CHANNELS) {
        expect(screen.getByTestId(`preference-toggle-${type}-${channel}`)).toBeTruthy();
      }
    }
  });

  it('optimistically flips a toggle, saves it, and confirms the server response', async () => {
    const initial = allOn();
    (getNotificationPreferences as jest.Mock).mockResolvedValue(initial);
    const saved = { ...initial, delay_alert: { ...initial.delay_alert, sms: false } };
    (updateNotificationPreferences as jest.Mock).mockResolvedValue(saved);

    render(<NotificationPreferencesScreen />);
    await waitFor(() => screen.getByTestId('preference-toggle-delay_alert-sms'));

    expect(screen.getByTestId('preference-toggle-delay_alert-sms').props.value).toBe(true);

    fireEvent(screen.getByTestId('preference-toggle-delay_alert-sms'), 'valueChange', false);

    // Optimistic: flips immediately, before the save resolves.
    expect(screen.getByTestId('preference-toggle-delay_alert-sms').props.value).toBe(false);

    await waitFor(() => {
      expect(updateNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ delay_alert: expect.objectContaining({ sms: false }) })
      );
    });
  });

  it('reverts the toggle AND shows an error when the save fails — never a silent revert', async () => {
    const initial = allOn();
    (getNotificationPreferences as jest.Mock).mockResolvedValue(initial);
    (updateNotificationPreferences as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<NotificationPreferencesScreen />);
    await waitFor(() => screen.getByTestId('preference-toggle-delay_alert-email'));

    fireEvent(screen.getByTestId('preference-toggle-delay_alert-email'), 'valueChange', false);
    // Optimistic flip happens first.
    expect(screen.getByTestId('preference-toggle-delay_alert-email').props.value).toBe(false);

    await waitFor(() => {
      expect(screen.getByTestId('preference-error-delay_alert:email')).toBeTruthy();
    });
    // Reverted back to true after the failed save.
    expect(screen.getByTestId('preference-toggle-delay_alert-email').props.value).toBe(true);
  });

  it('shows a retry-capable error state when the initial fetch fails', async () => {
    (getNotificationPreferences as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<NotificationPreferencesScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('notification-preferences-error')).toBeTruthy();
    });
    expect(screen.getByTestId('notification-preferences-retry-button')).toBeTruthy();
  });
});
