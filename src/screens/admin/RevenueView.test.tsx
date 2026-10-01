import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RevenueView from './RevenueView';
import { getAdminRevenue } from '../../api/admin';
import { clearAdminCache } from './useAdminQuery';

jest.mock('../../api/admin');

const mockRevenue = getAdminRevenue as jest.Mock;
const navigation = { navigate: jest.fn() } as any;
const route = { key: 'v', name: 'RevenueView' } as any;

const populated = {
  by_route: [{ route: 'A → B', revenue: 4_800_000 }],
  by_period: [{ period: '2026-W37', revenue: 3_300_000 }],
};

const renderScreen = () => render(<RevenueView navigation={navigation} route={route} />);

describe('RevenueView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAdminCache();
    mockRevenue.mockResolvedValue(populated);
  });

  it('fetches the default range on mount and formats revenue compactly', async () => {
    renderScreen();

    expect(await screen.findByText('₹4.8M')).toBeTruthy();
    expect(screen.getByText('₹3.3M')).toBeTruthy();
    expect(mockRevenue).toHaveBeenCalledTimes(1);
    const [from, to] = mockRevenue.mock.calls[0];
    expect(from <= to).toBe(true);
  });

  it('refetches with the new range when a valid range is applied', async () => {
    renderScreen();
    await screen.findByText('₹4.8M');

    fireEvent.changeText(screen.getByTestId('revenue-from'), '2026-08-01');
    fireEvent.changeText(screen.getByTestId('revenue-to'), '2026-08-31');
    fireEvent.press(screen.getByTestId('revenue-apply'));

    await waitFor(() => expect(mockRevenue).toHaveBeenLastCalledWith('2026-08-01', '2026-08-31'));
    expect(screen.queryByTestId('revenue-range-error')).toBeNull();
  });

  it('blocks the fetch and shows an error when start is after end', async () => {
    renderScreen();
    await screen.findByText('₹4.8M');
    mockRevenue.mockClear();

    fireEvent.changeText(screen.getByTestId('revenue-from'), '2026-09-30');
    fireEvent.changeText(screen.getByTestId('revenue-to'), '2026-09-01');
    fireEvent.press(screen.getByTestId('revenue-apply'));

    expect(screen.getByTestId('revenue-range-error')).toBeTruthy();
    expect(mockRevenue).not.toHaveBeenCalled();
  });

  it('does not fetch while merely typing — only on Apply', async () => {
    renderScreen();
    await screen.findByText('₹4.8M');
    mockRevenue.mockClear();

    fireEvent.changeText(screen.getByTestId('revenue-from'), '2026-01-01');
    expect(mockRevenue).not.toHaveBeenCalled();
  });

  it('renders empty states for a period with no data', async () => {
    mockRevenue.mockResolvedValue({ by_route: [], by_period: [] });
    renderScreen();

    expect(await screen.findByTestId('widget-revenue-by-route-empty')).toBeTruthy();
    expect(screen.getByTestId('widget-revenue-by-period-empty')).toBeTruthy();
  });

  it('shows error + retry when the fetch fails', async () => {
    mockRevenue.mockRejectedValueOnce(new Error('boom'));
    renderScreen();

    fireEvent.press(await screen.findByTestId('widget-revenue-by-route-retry'));
    expect(await screen.findByText('₹4.8M')).toBeTruthy();
  });
});
