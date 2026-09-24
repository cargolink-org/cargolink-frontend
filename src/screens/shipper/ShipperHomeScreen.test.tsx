import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ShipperHomeScreen from '../../../src/screens/shipper/ShipperHomeScreen';
import { useNotificationStore } from '../../../src/state/notificationStore';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('ShipperHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({ items: [], unreadCount: 0 });
  });

  it('navigates to the notification inbox from the quick-access button', () => {
    render(<ShipperHomeScreen />);
    fireEvent.press(screen.getByTestId('home-notifications-button'));
    expect(mockNavigate).toHaveBeenCalledWith('NotificationInbox');
  });

  it('shows the unread badge when there are unread notifications', () => {
    useNotificationStore.setState({ unreadCount: 2 });
    render(<ShipperHomeScreen />);
    expect(screen.getByTestId('notification-badge')).toBeTruthy();
  });
});
