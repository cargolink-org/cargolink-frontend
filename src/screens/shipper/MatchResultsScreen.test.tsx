import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MatchResultsScreen from './MatchResultsScreen';
import { getMatches } from '../../api/loads';
import { useLoadStore } from '../../state/loadStore';
import type { MatchResult } from '../../state/types';

jest.mock('../../api/loads', () => ({
  ...jest.requireActual('../../api/loads'),
  getMatches: jest.fn(),
}));

const mockGetMatches = getMatches as jest.Mock;
const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate } as any;
const route = { params: { loadId: 'load-1' }, key: 'MatchResults', name: 'MatchResults' } as any;

const sampleMatches: MatchResult[] = [
  { vehicle_id: 'vehicle-1', distance_km: 4.2, capacity_fit: true, eta: '12 min', score: 0.94 },
  { vehicle_id: 'vehicle-2', distance_km: 9.8, capacity_fit: true, eta: '24 min', score: 0.81 },
];

function resetLoadStore() {
  useLoadStore.setState({
    matches: [],
    matchesLoadId: null,
    selectedVehicleId: null,
    isLoadingMatches: false,
    matchesError: null,
  });
}

describe('MatchResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLoadStore();
  });

  it('fetches and renders matches on mount', async () => {
    mockGetMatches.mockResolvedValue(sampleMatches);

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('match-results-list')).toBeTruthy());
    expect(screen.getByTestId('match-card-vehicle-1')).toBeTruthy();
    expect(screen.getByTestId('match-card-vehicle-2')).toBeTruthy();
    expect(mockGetMatches).toHaveBeenCalledWith('load-1');
  });

  it('renders a proper empty state (not a blank screen) when there are zero matches', async () => {
    mockGetMatches.mockResolvedValue([]);

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('match-results-empty')).toBeTruthy());
    expect(screen.getByText(/no transporters are available for this route yet/i)).toBeTruthy();
    expect(screen.getByTestId('match-results-empty-refresh-button')).toBeTruthy();
  });

  it('renders an error state with retry when the fetch fails', async () => {
    mockGetMatches.mockRejectedValue({ kind: 'network', message: 'No network connection.' });

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('match-results-error')).toBeTruthy());
    expect(screen.getByText('No network connection.')).toBeTruthy();

    mockGetMatches.mockResolvedValue(sampleMatches);
    fireEvent.press(screen.getByTestId('match-results-retry-button'));

    await waitFor(() => expect(screen.getByTestId('match-results-list')).toBeTruthy());
  });

  it('selecting a card sets selectedVehicleId and navigates to FareQuoteScreen with the right params', async () => {
    mockGetMatches.mockResolvedValue(sampleMatches);

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('match-card-vehicle-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('match-card-vehicle-1'));

    expect(useLoadStore.getState().selectedVehicleId).toBe('vehicle-1');
    expect(mockNavigate).toHaveBeenCalledWith('FareQuoteScreen', {
      loadId: 'load-1',
      vehicleId: 'vehicle-1',
    });
  });

  it('pull-to-refresh re-triggers the fetch', async () => {
    mockGetMatches.mockResolvedValue(sampleMatches);

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('match-results-list')).toBeTruthy());
    expect(mockGetMatches).toHaveBeenCalledTimes(1);

    // MatchResultsScreen wires FlatList's own `refreshing`/`onRefresh`
    // convenience props (rather than a custom `refreshControl` element),
    // so firing 'refresh' directly on the FlatList invokes onRefresh.
    const list = screen.getByTestId('match-results-list');
    fireEvent(list, 'refresh');

    await waitFor(() => expect(mockGetMatches).toHaveBeenCalledTimes(2));
  });

  it('skips re-fetching when matches are already cached for this loadId (brief-cache requirement)', async () => {
    useLoadStore.setState({
      matches: sampleMatches,
      matchesLoadId: 'load-1',
      isLoadingMatches: false,
      matchesError: null,
    });

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('match-results-list')).toBeTruthy());
    expect(mockGetMatches).not.toHaveBeenCalled();
  });

  it('re-fetches when the cache pointer was invalidated for the same loadId', async () => {
    useLoadStore.setState({
      matches: sampleMatches,
      matchesLoadId: null, // invalidated by the accept-conflict recovery path
      isLoadingMatches: false,
      matchesError: null,
    });
    mockGetMatches.mockResolvedValue(sampleMatches);

    render(<MatchResultsScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(mockGetMatches).toHaveBeenCalledWith('load-1'));
  });
});
