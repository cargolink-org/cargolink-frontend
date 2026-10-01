import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import RoutesHeatmap from './RoutesHeatmap';
import { getAdminRoutes } from '../../api/admin';
import { clearAdminCache } from './useAdminQuery';

jest.mock('../../api/admin');

const mockRoutes = getAdminRoutes as jest.Mock;
const navigation = { navigate: jest.fn() } as any;
const route = { key: 'r', name: 'RoutesHeatmap' } as any;

describe('RoutesHeatmap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAdminCache();
  });

  it('renders a ranked list in backend order with proportional bars', async () => {
    mockRoutes.mockResolvedValue([
      { route: 'A → B', shipment_count: 1_200_000 },
      { route: 'C → D', shipment_count: 600_000 },
    ]);
    render(<RoutesHeatmap navigation={navigation} route={route} />);

    expect(await screen.findByText('1. A → B')).toBeTruthy();
    expect(screen.getByText('2. C → D')).toBeTruthy();
    expect(screen.getByText('1.2M shipments')).toBeTruthy();
    expect(screen.getByTestId('routes-list-bar-A → B').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '100%' })])
    );
    expect(screen.getByTestId('routes-list-bar-C → D').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '50%' })])
    );
  });

  it('does not re-sort the backend-supplied order', async () => {
    mockRoutes.mockResolvedValue([
      { route: 'Small', shipment_count: 1 },
      { route: 'Big', shipment_count: 99 },
    ]);
    render(<RoutesHeatmap navigation={navigation} route={route} />);
    expect(await screen.findByText('1. Small')).toBeTruthy();
    expect(screen.getByText('2. Big')).toBeTruthy();
  });

  it('shows the empty state for no route data', async () => {
    mockRoutes.mockResolvedValue([]);
    render(<RoutesHeatmap navigation={navigation} route={route} />);
    expect(await screen.findByTestId('widget-routes-empty')).toBeTruthy();
  });

  it('shows an error with retry, and recovers', async () => {
    mockRoutes.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([{ route: 'A → B', shipment_count: 5 }]);
    render(<RoutesHeatmap navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByTestId('widget-routes-retry'));
    expect(await screen.findByText('1. A → B')).toBeTruthy();
  });

  it('exposes an accessible text summary', async () => {
    mockRoutes.mockResolvedValue([{ route: 'A → B', shipment_count: 5 }]);
    render(<RoutesHeatmap navigation={navigation} route={route} />);
    const summary = await screen.findByTestId('widget-routes-summary');
    expect(summary.props.accessibilityLabel).toContain('Busiest: A → B');
  });
});
