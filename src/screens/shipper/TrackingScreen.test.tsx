import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';

import TrackingScreen from './TrackingScreen';
import { getTrackingHistory } from '../../api/tracking';
import * as sockets from '../../services/sockets';
import { useTrackingStore } from '../../state/trackingStore';

jest.mock('../../api/tracking', () => ({
  ...jest.requireActual('../../api/tracking'),
  getTrackingHistory: jest.fn(),
}));

jest.mock('../../services/sockets');

const mockGetTrackingHistory = getTrackingHistory as jest.Mock;
const mockJoinRoom = sockets.joinRoom as jest.Mock;
const mockLeaveRoom = sockets.leaveRoom as jest.Mock;
const mockOnLocationUpdate = sockets.onLocationUpdate as jest.Mock;
const mockOnConnectionStateChange = sockets.onConnectionStateChange as jest.Mock;

let locationListener: ((payload: sockets.LocationUpdatePayload) => void) | null = null;
let connectionListener: ((state: string) => void) | null = null;
const unsubscribeLocation = jest.fn();
const unsubscribeConnection = jest.fn();

const route = {
  params: { loadId: 'load-1', vehicleId: 'vehicle-1', eta: '12 min' },
  key: 'Tracking',
  name: 'Tracking',
} as any;
const navigation = {} as any;

function resetTrackingStore() {
  useTrackingStore.setState({ currentPosition: null, connectionState: 'connecting', lastUpdatedAt: null });
}

describe('TrackingScreen (shipper variant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTrackingStore();
    locationListener = null;
    connectionListener = null;
    mockOnLocationUpdate.mockImplementation((cb: (payload: sockets.LocationUpdatePayload) => void) => {
      locationListener = cb;
      return unsubscribeLocation;
    });
    mockOnConnectionStateChange.mockImplementation((cb: (state: string) => void) => {
      connectionListener = cb;
      return unsubscribeConnection;
    });
    mockGetTrackingHistory.mockResolvedValue([]);
  });

  it('shows the map skeleton ("not yet connected") before any position is known', () => {
    render(<TrackingScreen route={route} navigation={navigation} />);

    expect(screen.getByTestId('tracking-map-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('tracking-map')).toBeNull();
    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Connecting…');
  });

  it('joins the room for the given loadId and fetches history for the given vehicleId on mount', async () => {
    render(<TrackingScreen route={route} navigation={navigation} />);

    await waitFor(() => expect(mockGetTrackingHistory).toHaveBeenCalledWith('vehicle-1'));
    expect(mockJoinRoom).toHaveBeenCalledWith('load-1');
  });

  it('renders an initial marker from the most recent historical position on mount', async () => {
    mockGetTrackingHistory.mockResolvedValue([
      { lat: 18.5, lng: 73.8, timestamp: '2026-01-01T00:00:00.000Z' },
      { lat: 18.6, lng: 73.9, timestamp: '2026-01-01T00:05:00.000Z' },
    ]);

    render(<TrackingScreen route={route} navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('tracking-map')).toBeTruthy());
    expect(screen.queryByTestId('tracking-map-skeleton')).toBeNull();
  });

  it('renders the ETA badge from the eta route param', () => {
    render(<TrackingScreen route={route} navigation={navigation} />);
    expect(screen.getByText('ETA 12 min')).toBeTruthy();
  });

  it('shows a neutral ETA state when no eta param was passed', () => {
    const routeWithoutEta = { ...route, params: { loadId: 'load-1', vehicleId: 'vehicle-1' } };
    render(<TrackingScreen route={routeWithoutEta} navigation={navigation} />);
    expect(screen.getByText('ETA: Calculating…')).toBeTruthy();
  });

  it('updates the marker and status to "Live" on a live location:update event', async () => {
    render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockOnLocationUpdate).toHaveBeenCalled());

    act(() => {
      connectionListener?.('live');
      locationListener?.({ lat: 19.0, lng: 72.9, ts: '2026-01-01T00:10:00.000Z' });
    });

    await waitFor(() => expect(screen.getByTestId('tracking-map')).toBeTruthy());
    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Live');
  });

  it('renders a distinct "Reconnecting…" state on a simulated disconnect', async () => {
    render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockOnConnectionStateChange).toHaveBeenCalled());

    act(() => {
      connectionListener?.('live');
    });
    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Live');

    act(() => {
      connectionListener?.('reconnecting');
    });
    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Reconnecting…');
  });

  it('renders "Last seen X min ago" — not a frozen "Live" marker — once the connection is reported lost', async () => {
    mockGetTrackingHistory.mockResolvedValue([
      { lat: 18.5, lng: 73.8, timestamp: new Date(Date.now() - 4 * 60_000).toISOString() },
    ]);

    render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('tracking-map')).toBeTruthy());

    act(() => {
      connectionListener?.('lost');
    });

    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent(/Last seen \d+ min ago/);
  });

  it('degrades gracefully (non-blocking) when the historical fetch fails — map still works once a live position arrives', async () => {
    mockGetTrackingHistory.mockRejectedValue({ kind: 'network', message: 'No network connection.' });

    render(<TrackingScreen route={route} navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('tracking-history-error')).toBeTruthy());
    // Still shows the skeleton (no position yet), not a crash.
    expect(screen.getByTestId('tracking-map-skeleton')).toBeTruthy();

    act(() => {
      locationListener?.({ lat: 1, lng: 2, ts: '2026-01-01T00:00:00.000Z' });
    });

    await waitFor(() => expect(screen.getByTestId('tracking-map')).toBeTruthy());
  });

  it('unsubscribes from both listeners and leaves the room on unmount, with no leaks across repeated mount/unmount cycles', async () => {
    const { unmount } = render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledTimes(1));

    unmount();

    expect(unsubscribeLocation).toHaveBeenCalledTimes(1);
    expect(unsubscribeConnection).toHaveBeenCalledTimes(1);
    expect(mockLeaveRoom).toHaveBeenCalledTimes(1);

    // Remount — a fresh subscription must be created, never stacked on top
    // of the one already torn down (the named failure mode for this
    // screen per the task spec).
    const { unmount: unmountAgain } = render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledTimes(2));
    unmountAgain();

    expect(unsubscribeLocation).toHaveBeenCalledTimes(2);
    expect(unsubscribeConnection).toHaveBeenCalledTimes(2);
    expect(mockLeaveRoom).toHaveBeenCalledTimes(2);
  });

  it('re-joins a new room when the loadId/vehicleId route params change', async () => {
    const { rerender } = render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledWith('load-1'));

    const newRoute = { ...route, params: { loadId: 'load-2', vehicleId: 'vehicle-2', eta: '5 min' } };
    rerender(<TrackingScreen route={newRoute} navigation={navigation} />);

    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledWith('load-2'));
    expect(mockLeaveRoom).toHaveBeenCalled(); // old room torn down first
  });
});
