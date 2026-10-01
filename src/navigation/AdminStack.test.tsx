import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import AdminStack from './AdminStack';
import { useAuthStore } from '../state/authStore';
import { getAdminOverview, getAdminRoutes } from '../api/admin';

jest.mock('../api/admin');

const mockOverview = getAdminOverview as jest.Mock;
const mockRoutes = getAdminRoutes as jest.Mock;

function setRole(role: 'shipper' | 'transporter' | 'admin' | null) {
  useAuthStore.setState({ isAuthenticated: role !== null, role, isHydrated: true });
}

const renderStack = () =>
  render(
    <NavigationContainer>
      <AdminStack />
    </NavigationContainer>
  );

describe('AdminStack role gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOverview.mockResolvedValue({ active: 1, completed: 2, delayed: 0, revenue: 100, top_routes: [] });
    mockRoutes.mockResolvedValue([{ route: 'A → B', shipment_count: 3 }]);
  });

  it('renders the dashboard for an admin session', async () => {
    setRole('admin');
    renderStack();
    expect(await screen.findByTestId('widget-status')).toBeTruthy();
  });

  it.each([['shipper' as const], ['transporter' as const], [null]])(
    'renders no admin screens and fires NO admin fetches for role=%s',
    async (role) => {
      setRole(role);
      renderStack();

      // Let any (erroneous) effects flush.
      await new Promise((r) => setTimeout(r, 0));

      expect(screen.queryByTestId('widget-status')).toBeNull();
      expect(screen.queryByTestId('admin-nav-RoutesHeatmap')).toBeNull();
      expect(mockOverview).not.toHaveBeenCalled();
      expect(mockRoutes).not.toHaveBeenCalled();
    }
  );

  it('lets an admin navigate between all four views', async () => {
    setRole('admin');
    renderStack();
    await screen.findByTestId('widget-status');

    fireEvent.press(screen.getByTestId('admin-nav-RoutesHeatmap'));
    expect(await screen.findByTestId('widget-routes')).toBeTruthy();
  });
});
