import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import DashboardOverview from './DashboardOverview';
import { getAdminOverview, getAdminRoutes } from '../../api/admin';
import { clearAdminCache } from './useAdminQuery';

jest.mock('../../api/admin');

const mockOverview = getAdminOverview as jest.Mock;
const mockRoutes = getAdminRoutes as jest.Mock;
const navigation = { navigate: jest.fn() } as any;
const route = { key: 'o', name: 'DashboardOverview' } as any;

const populated = {
  active: 134,
  completed: 1820,
  delayed: 17,
  cancelled: 42,
  revenue: 12_400_000,
  top_routes: [],
};
const routes = [
  { route: 'A → B', shipment_count: 400 },
  { route: 'C → D', shipment_count: 200 },
  { route: 'E → F', shipment_count: 100 },
  { route: 'G → H', shipment_count: 50 },
];

const renderScreen = () => render(<DashboardOverview navigation={navigation} route={route} />);

describe('DashboardOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAdminCache();
    mockOverview.mockResolvedValue(populated);
    mockRoutes.mockResolvedValue(routes);
  });

  // Two independent fetches settle at different times; flush whatever is
  // still in flight so late state updates land inside act().
  afterEach(async () => {
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('shows skeleton loaders before data arrives', async () => {
    renderScreen();
    expect(screen.getByTestId('widget-status-loading')).toBeTruthy();
    expect(screen.getByTestId('widget-top-routes-loading')).toBeTruthy();
    // Let the fetches settle so no update lands after the test ends.
    await screen.findByTestId('top-routes-preview');
  });

  it('renders status tiles, formatted revenue, and a 3-row route preview', async () => {
    renderScreen();

    expect(await screen.findByTestId('tile-active')).toBeTruthy();
    expect(screen.getByTestId('tile-active').props.accessibilityLabel).toBe('Active: 134');
    // Large numbers use the shared compact formatter, not raw digits.
    expect(screen.getByText('1.8K')).toBeTruthy();
    expect(screen.getByTestId('revenue-headline').props.children).toBe('₹12.4M');
    expect(screen.getByTestId('tile-cancelled')).toBeTruthy();
    expect(screen.getByTestId('top-routes-preview-row-A → B')).toBeTruthy();
    expect(screen.queryByTestId('top-routes-preview-row-G → H')).toBeNull();
  });

  it('exposes text summaries for screen readers', async () => {
    renderScreen();
    const summary = await screen.findByTestId('widget-status-summary');
    expect(summary.props.accessibilityLabel).toContain('17 delayed');
  });

  it('renders proper empty states (not broken charts) for the no-data variant', async () => {
    mockOverview.mockResolvedValue({ active: 0, completed: 0, delayed: 0, revenue: 0, top_routes: [] });
    mockRoutes.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByTestId('widget-status-empty')).toBeTruthy();
    expect(screen.getByTestId('widget-revenue-empty')).toBeTruthy();
    expect(screen.getByTestId('widget-top-routes-empty')).toBeTruthy();
  });

  it('omits the cancelled tile when the backend does not return it', async () => {
    mockOverview.mockResolvedValue({ ...populated, cancelled: undefined });
    renderScreen();
    await screen.findByTestId('tile-active');
    expect(screen.queryByTestId('tile-cancelled')).toBeNull();
  });

  it('degrades ONLY the failing widgets when the overview call fails', async () => {
    mockOverview.mockRejectedValue(new Error('boom'));
    renderScreen();

    expect(await screen.findByTestId('widget-status-error')).toBeTruthy();
    expect(screen.getByTestId('widget-revenue-error')).toBeTruthy();
    // Routes widget is unaffected.
    expect(await screen.findByTestId('top-routes-preview')).toBeTruthy();
    expect(screen.queryByTestId('widget-top-routes-error')).toBeNull();
  });

  it('degrades ONLY the routes widget when the routes call fails', async () => {
    mockRoutes.mockRejectedValue(new Error('boom'));
    renderScreen();

    expect(await screen.findByTestId('widget-top-routes-error')).toBeTruthy();
    expect(await screen.findByTestId('tile-active')).toBeTruthy();
    expect(screen.queryByTestId('widget-status-error')).toBeNull();
  });

  it('retries a failed widget without refetching its healthy siblings', async () => {
    mockRoutes.mockRejectedValueOnce(new Error('boom'));
    renderScreen();

    fireEvent.press(await screen.findByTestId('widget-top-routes-retry'));

    expect(await screen.findByTestId('top-routes-preview')).toBeTruthy();
    expect(mockRoutes).toHaveBeenCalledTimes(2);
    expect(mockOverview).toHaveBeenCalledTimes(1);
  });

  it('Refresh bypasses the cache and refetches everything', async () => {
    renderScreen();
    await screen.findByTestId('tile-active');

    fireEvent.press(screen.getByTestId('admin-refresh'));

    await waitFor(() => expect(mockOverview).toHaveBeenCalledTimes(2));
    expect(mockRoutes).toHaveBeenCalledTimes(2);
  });

  it('serves a second mount from the short-TTL cache instead of refetching', async () => {
    const first = renderScreen();
    await screen.findByTestId('tile-active');
    first.unmount();

    renderScreen();
    expect(screen.getByTestId('tile-active')).toBeTruthy(); // immediately, no loading state
    expect(mockOverview).toHaveBeenCalledTimes(1);
  });

  it('links to the full routes view', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('view-all-routes'));
    expect(navigation.navigate).toHaveBeenCalledWith('RoutesHeatmap');
  });
});
