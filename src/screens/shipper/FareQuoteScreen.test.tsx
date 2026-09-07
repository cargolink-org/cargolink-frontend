import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import FareQuoteScreen from './FareQuoteScreen';
import { getQuote } from '../../api/pricing';
import { acceptMatch } from '../../api/loads';
import { useLoadStore } from '../../state/loadStore';
import type { FareQuote } from '../../state/types';

jest.mock('../../api/pricing', () => ({
  ...jest.requireActual('../../api/pricing'),
  getQuote: jest.fn(),
}));

jest.mock('../../api/loads', () => ({
  ...jest.requireActual('../../api/loads'),
  acceptMatch: jest.fn(),
}));

const mockGetQuote = getQuote as jest.Mock;
const mockAcceptMatch = acceptMatch as jest.Mock;
const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate } as any;
const route = {
  params: { loadId: 'load-1', vehicleId: 'vehicle-1', eta: '12 min' },
  key: 'FareQuoteScreen',
  name: 'FareQuoteScreen',
} as any;

const sampleQuote: FareQuote = { base_fare: 2500, distance_cost: 1400, surcharge: 300, total: 4200 };

function resetLoadStore() {
  useLoadStore.setState({
    quote: null,
    isLoadingQuote: false,
    quoteError: null,
    isAccepting: false,
    acceptError: null,
    acceptedMatch: null,
    matches: [{ vehicle_id: 'vehicle-1', distance_km: 4.2, capacity_fit: true, eta: '12 min', score: 0.9 }],
    matchesLoadId: 'load-1',
  });
}

describe('FareQuoteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLoadStore();
  });

  it('fetches and renders the fare breakdown on mount', async () => {
    mockGetQuote.mockResolvedValue(sampleQuote);

    render(<FareQuoteScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('fare-breakdown')).toBeTruthy());
    expect(screen.getByTestId('fare-breakdown-total')).toHaveTextContent('₹4,200');
    expect(mockGetQuote).toHaveBeenCalledWith('load-1', 'vehicle-1');
  });

  it('renders an error state with retry when the quote fetch fails', async () => {
    mockGetQuote.mockRejectedValue({ kind: 'network', message: 'No network connection.' });

    render(<FareQuoteScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('fare-quote-error')).toBeTruthy());

    mockGetQuote.mockResolvedValue(sampleQuote);
    fireEvent.press(screen.getByTestId('fare-quote-retry-button'));

    await waitFor(() => expect(screen.getByTestId('fare-breakdown')).toBeTruthy());
  });

  it('accepts successfully when the price is unchanged, updating acceptedMatch and navigating to Tracking', async () => {
    mockGetQuote.mockResolvedValue(sampleQuote); // same total on both the initial fetch and the pre-accept re-check
    mockAcceptMatch.mockResolvedValue({ match_id: 'match-999', status: 'accepted' });

    render(<FareQuoteScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('fare-breakdown')).toBeTruthy());
    fireEvent.press(screen.getByTestId('fare-quote-accept-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Tracking', {
        loadId: 'load-1',
        vehicleId: 'vehicle-1',
        eta: '12 min',
      });
    });
    expect(useLoadStore.getState().acceptedMatch).toEqual({ match_id: 'match-999', status: 'accepted' });
    expect(mockAcceptMatch).toHaveBeenCalledWith('load-1', 'vehicle-1');
  });

  it('shows a distinct, non-crashing conflict UI when the match is no longer available, with a working refresh-matches recovery action', async () => {
    mockGetQuote.mockResolvedValue(sampleQuote);
    mockAcceptMatch.mockRejectedValue({
      kind: 'conflict',
      message: 'This transporter is no longer available — please refresh and choose another.',
    });

    render(<FareQuoteScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('fare-breakdown')).toBeTruthy());
    fireEvent.press(screen.getByTestId('fare-quote-accept-button'));

    await waitFor(() => expect(screen.getByTestId('fare-quote-conflict-banner')).toBeTruthy());
    expect(
      screen.getByText(/this transporter is no longer available/i)
    ).toBeTruthy();
    // Must not be presented as the generic retryable-error banner.
    expect(screen.queryByTestId('fare-quote-error-banner')).toBeNull();

    fireEvent.press(screen.getByTestId('fare-quote-refresh-matches-button'));

    expect(useLoadStore.getState().matchesLoadId).toBeNull(); // cache invalidated
    expect(mockNavigate).toHaveBeenCalledWith('MatchResults', { loadId: 'load-1' });
  });

  it('shows a generic retryable error banner (not the conflict UI) on a network failure during accept', async () => {
    mockGetQuote.mockResolvedValue(sampleQuote);
    mockAcceptMatch.mockRejectedValue({
      kind: 'network',
      message: 'No network connection. Check your connection and try again.',
    });

    render(<FareQuoteScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('fare-breakdown')).toBeTruthy());
    fireEvent.press(screen.getByTestId('fare-quote-accept-button'));

    await waitFor(() => expect(screen.getByTestId('fare-quote-error-banner')).toBeTruthy());
    expect(screen.queryByTestId('fare-quote-conflict-banner')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalledWith('Tracking', expect.anything());
  });

  it('surfaces a stale-quote change distinctly instead of silently accepting the old price', async () => {
    const updatedQuote: FareQuote = { base_fare: 2500, distance_cost: 1400, surcharge: 750, total: 4650 };
    mockGetQuote
      .mockResolvedValueOnce(sampleQuote) // initial fetch on mount
      .mockResolvedValueOnce(updatedQuote); // silent re-check right before accept

    render(<FareQuoteScreen navigation={navigation} route={route} />);

    await waitFor(() => expect(screen.getByTestId('fare-breakdown-total')).toHaveTextContent('₹4,200'));
    fireEvent.press(screen.getByTestId('fare-quote-accept-button'));

    await waitFor(() => expect(screen.getByTestId('fare-quote-stale-banner')).toBeTruthy());
    // The displayed total updates to the fresh price...
    expect(screen.getByTestId('fare-breakdown-total')).toHaveTextContent('₹4,650');
    // ...and accept is NOT silently honored at the old (or even the new) price.
    expect(mockAcceptMatch).not.toHaveBeenCalled();
  });
});
