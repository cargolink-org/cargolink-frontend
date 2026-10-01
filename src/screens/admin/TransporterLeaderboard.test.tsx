import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TransporterLeaderboard from './TransporterLeaderboard';
import { getTransporterLeaderboard } from '../../api/admin';
import { clearAdminCache } from './useAdminQuery';

jest.mock('../../api/admin');

const mockBoard = getTransporterLeaderboard as jest.Mock;
const navigation = { navigate: jest.fn() } as any;
const route = { key: 'l', name: 'TransporterLeaderboard' } as any;

const entries = [
  { transporter_id: 't-1', name: 'Sharma Logistics', rating_avg: 4.9, completed_trips: 312 },
  { transporter_id: 't-2', name: 'Patil Transport', rating_avg: 4.7, completed_trips: 1_250 },
];

describe('TransporterLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAdminCache();
  });

  it('renders rank, name, rating and trips in backend order', async () => {
    mockBoard.mockResolvedValue(entries);
    render(<TransporterLeaderboard navigation={navigation} route={route} />);

    const first = await screen.findByTestId('leaderboard-row-t-1');
    expect(first.props.accessibilityLabel).toBe(
      'Rank 1, Sharma Logistics, rating 4.9 out of 5, 312 completed trips'
    );
    expect(screen.getByText('★ 4.7')).toBeTruthy();
    expect(screen.getByText('1.3K trips')).toBeTruthy(); // 1,250 -> compact
    expect(screen.getByText('312 trips')).toBeTruthy();
  });

  it('shows the empty state when no transporters are rated', async () => {
    mockBoard.mockResolvedValue([]);
    render(<TransporterLeaderboard navigation={navigation} route={route} />);
    expect(await screen.findByTestId('widget-leaderboard-empty')).toBeTruthy();
  });

  it('shows error + retry, then recovers', async () => {
    mockBoard.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(entries);
    render(<TransporterLeaderboard navigation={navigation} route={route} />);

    fireEvent.press(await screen.findByTestId('widget-leaderboard-retry'));
    expect(await screen.findByTestId('leaderboard-row-t-1')).toBeTruthy();
  });
});
