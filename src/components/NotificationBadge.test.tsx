import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NotificationBadge } from './NotificationBadge';
import { useNotificationStore } from '../state/notificationStore';

describe('NotificationBadge', () => {
  beforeEach(() => {
    useNotificationStore.setState({ items: [], unreadCount: 0 });
  });

  it('renders nothing when unread count is zero', () => {
    render(<NotificationBadge />);
    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('renders the unread count', () => {
    useNotificationStore.setState({ unreadCount: 3 });
    render(<NotificationBadge />);
    expect(screen.getByTestId('notification-badge')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('caps the displayed count at 99+', () => {
    useNotificationStore.setState({ unreadCount: 140 });
    render(<NotificationBadge />);
    expect(screen.getByText('99+')).toBeTruthy();
  });
});
