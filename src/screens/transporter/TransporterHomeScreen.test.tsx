import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TransporterHomeScreen from '../../../src/screens/transporter/TransporterHomeScreen';
import { useNotificationStore } from '../../../src/state/notificationStore';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../src/state/vehicleStore', () => ({
  useVehicleStore: (selector: (s: { vehicle: undefined }) => unknown) => selector({ vehicle: undefined }),
}));

describe('TransporterHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({ items: [], unreadCount: 0 });
  });

  it('navigates to the notification inbox from the quick-access button', () => {
    render(<TransporterHomeScreen />);
    fireEvent.press(screen.getByTestId('home-notifications-button'));
    expect(mockNavigate).toHaveBeenCalledWith('NotificationInbox');
  });

  it('shows the unread badge when there are unread notifications', () => {
    useNotificationStore.setState({ unreadCount: 5 });
    render(<TransporterHomeScreen />);
    expect(screen.getByTestId('notification-badge')).toBeTruthy();
  });

  it('still navigates to Tracking from the existing Start Trip button', () => {
    render(<TransporterHomeScreen />);
    fireEvent.press(screen.getByTestId('start-trip-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Tracking', expect.objectContaining({ loadId: 'load-demo-001' }));
  });
});
