import React from 'react';
import { Alert } from 'react-native';
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

// Alert.alert is a native module call — spy on it rather than letting the
// real RN implementation run (unavailable in the Jest environment).
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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
  params: { loadId: 'load-1', vehicleId: 'vehicle-1' },
  key: 'Tracking',
  name: 'Tracking',
} as any;
const navigation = {} as any;

function resetTrackingStore() {
  useTrackingStore.setState({ currentPosition: null, connectionState: 'connecting', lastUpdatedAt: null });
}

describe('TrackingScreen (transporter variant)', () => {
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

  it('shows the map skeleton before any position is known', () => {
    render(<TrackingScreen route={route} navigation={navigation} />);

    expect(screen.getByTestId('tracking-map-skeleton')).toBeTruthy();
    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Connecting…');
  });

  it('joins the room for loadId and fetches history for vehicleId on mount', async () => {
    render(<TrackingScreen route={route} navigation={navigation} />);

    await waitFor(() => expect(mockGetTrackingHistory).toHaveBeenCalledWith('vehicle-1'));
    expect(mockJoinRoom).toHaveBeenCalledWith('load-1');
  });

  it('renders its own live position on a location:update event', async () => {
    render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockOnLocationUpdate).toHaveBeenCalled());

    act(() => {
      connectionListener?.('live');
      locationListener?.({ lat: 19.0, lng: 72.9, ts: '2026-01-01T00:10:00.000Z' });
    });

    await waitFor(() => expect(screen.getByTestId('tracking-map')).toBeTruthy());
    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Live');
  });

  it('renders "Reconnecting…" on a simulated disconnect', async () => {
    render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockOnConnectionStateChange).toHaveBeenCalled());

    act(() => connectionListener?.('live'));
    act(() => connectionListener?.('reconnecting'));

    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent('Reconnecting…');
  });

  it('renders "Last seen X min ago" once the connection is reported lost', async () => {
    mockGetTrackingHistory.mockResolvedValue([
      { lat: 18.5, lng: 73.8, timestamp: new Date(Date.now() - 6 * 60_000).toISOString() },
    ]);

    render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('tracking-map')).toBeTruthy());

    act(() => connectionListener?.('lost'));

    expect(screen.getByTestId('tracking-status-text')).toHaveTextContent(/Last seen \d+ min ago/);
  });

  it('provides a checkpoint-update quick-access affordance (navigation entry point only)', () => {
    render(<TrackingScreen route={route} navigation={navigation} />);

    const button = screen.getByTestId('tracking-checkpoint-quick-access');
    expect(button).toBeTruthy();
  });

  it('unsubscribes from both listeners and leaves the room on unmount, with no leaks across remounts', async () => {
    const { unmount } = render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledTimes(1));

    unmount();

    expect(unsubscribeLocation).toHaveBeenCalledTimes(1);
    expect(unsubscribeConnection).toHaveBeenCalledTimes(1);
    expect(mockLeaveRoom).toHaveBeenCalledTimes(1);

    const { unmount: unmountAgain } = render(<TrackingScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledTimes(2));
    unmountAgain();

    expect(unsubscribeLocation).toHaveBeenCalledTimes(2);
    expect(unsubscribeConnection).toHaveBeenCalledTimes(2);
    expect(mockLeaveRoom).toHaveBeenCalledTimes(2);
  });
});
