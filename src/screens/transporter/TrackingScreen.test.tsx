import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react-native';

import TrackingScreen from './TrackingScreen';
import { getTrackingHistory } from '../../api/tracking';
import * as sockets from '../../services/sockets';
import * as location from '../../services/location';
import { useTrackingStore } from '../../state/trackingStore';

jest.mock('../../api/tracking', () => ({
  ...jest.requireActual('../../api/tracking'),
  getTrackingHistory: jest.fn(),
}));

jest.mock('../../services/sockets');
jest.mock('../../services/location');

// Alert.alert is a native module call — spy on it rather than letting the
// real RN implementation run (unavailable in the Jest environment).
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockGetTrackingHistory = getTrackingHistory as jest.Mock;
const mockJoinRoom = sockets.joinRoom as jest.Mock;
const mockLeaveRoom = sockets.leaveRoom as jest.Mock;
const mockOnLocationUpdate = sockets.onLocationUpdate as jest.Mock;
const mockOnConnectionStateChange = sockets.onConnectionStateChange as jest.Mock;

const mockGetTrackingStatus = location.getTrackingStatus as jest.Mock;
const mockStartBackgroundTracking = location.startBackgroundTracking as jest.Mock;
const mockStopBackgroundTracking = location.stopBackgroundTracking as jest.Mock;
const mockOnPermissionRevokedChange = location.onPermissionRevokedChange as jest.Mock;

let locationListener: ((payload: sockets.LocationUpdatePayload) => void) | null = null;
let connectionListener: ((state: string) => void) | null = null;
let permissionRevokedListener: ((revoked: boolean) => void) | null = null;
const unsubscribeLocation = jest.fn();
const unsubscribeConnection = jest.fn();
const unsubscribePermissionRevoked = jest.fn();

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
    permissionRevokedListener = null;
    mockOnLocationUpdate.mockImplementation((cb: (payload: sockets.LocationUpdatePayload) => void) => {
      locationListener = cb;
      return unsubscribeLocation;
    });
    mockOnConnectionStateChange.mockImplementation((cb: (state: string) => void) => {
      connectionListener = cb;
      return unsubscribeConnection;
    });
    mockGetTrackingHistory.mockResolvedValue([]);

    mockGetTrackingStatus.mockReturnValue({
      isTracking: false,
      loadId: null,
      vehicleId: null,
      lastEmittedAt: null,
      bufferedCount: 0,
      permissionRevoked: false,
    });
    mockStartBackgroundTracking.mockResolvedValue({ started: true, backgroundGranted: true });
    mockStopBackgroundTracking.mockResolvedValue(undefined);
    mockOnPermissionRevokedChange.mockImplementation((cb: (revoked: boolean) => void) => {
      permissionRevokedListener = cb;
      return unsubscribePermissionRevoked;
    });
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

  describe('Start Trip / End Trip (Task E.2)', () => {
    it('shows "Start Trip" by default and "End Trip" is not present', () => {
      render(<TrackingScreen route={route} navigation={navigation} />);

      expect(screen.getByTestId('tracking-start-trip')).toBeTruthy();
      expect(screen.queryByTestId('tracking-end-trip')).toBeNull();
    });

    it('pressing "Start Trip" shows the permission primer before calling startBackgroundTracking', () => {
      render(<TrackingScreen route={route} navigation={navigation} />);

      fireEvent.press(screen.getByTestId('tracking-start-trip'));

      expect(screen.getByTestId('location-permission-prompt-title')).toBeTruthy();
      expect(mockStartBackgroundTracking).not.toHaveBeenCalled();
    });

    it('"Continue" on the primer starts tracking with the correct trip and flips the button to "End Trip"', async () => {
      render(<TrackingScreen route={route} navigation={navigation} />);

      fireEvent.press(screen.getByTestId('tracking-start-trip'));
      fireEvent.press(screen.getByTestId('location-permission-prompt-continue'));

      await waitFor(() =>
        expect(mockStartBackgroundTracking).toHaveBeenCalledWith({ loadId: 'load-1', vehicleId: 'vehicle-1' })
      );
      await waitFor(() => expect(screen.getByTestId('tracking-end-trip')).toBeTruthy());
      expect(screen.queryByTestId('location-permission-prompt-title')).toBeNull();
    });

    it('warns (without blocking the trip) when only foreground permission was granted', async () => {
      mockStartBackgroundTracking.mockResolvedValue({ started: true, backgroundGranted: false });
      render(<TrackingScreen route={route} navigation={navigation} />);

      fireEvent.press(screen.getByTestId('tracking-start-trip'));
      fireEvent.press(screen.getByTestId('location-permission-prompt-continue'));

      await waitFor(() => expect(screen.getByTestId('tracking-end-trip')).toBeTruthy());
      expect(Alert.alert).toHaveBeenCalledWith(
        'Background tracking limited',
        expect.stringContaining('Settings')
      );
    });

    it('switches the prompt to the "denied" step instead of a dead end when permission is refused', async () => {
      mockStartBackgroundTracking.mockResolvedValue({ started: false, reason: 'permission_denied' });
      render(<TrackingScreen route={route} navigation={navigation} />);

      fireEvent.press(screen.getByTestId('tracking-start-trip'));
      fireEvent.press(screen.getByTestId('location-permission-prompt-continue'));

      await waitFor(() => expect(screen.getByTestId('location-permission-prompt-denied-title')).toBeTruthy());
      // Still "Start Trip", not "End Trip" — nothing actually started.
      expect(screen.getByTestId('tracking-start-trip')).toBeTruthy();
    });

    it('"Not now" on the primer dismisses without calling startBackgroundTracking', () => {
      render(<TrackingScreen route={route} navigation={navigation} />);

      fireEvent.press(screen.getByTestId('tracking-start-trip'));
      fireEvent.press(screen.getByTestId('location-permission-prompt-dismiss'));

      expect(screen.queryByTestId('location-permission-prompt-title')).toBeNull();
      expect(mockStartBackgroundTracking).not.toHaveBeenCalled();
    });

    it('pressing "End Trip" stops background tracking and flips the button back to "Start Trip"', async () => {
      render(<TrackingScreen route={route} navigation={navigation} />);
      fireEvent.press(screen.getByTestId('tracking-start-trip'));
      fireEvent.press(screen.getByTestId('location-permission-prompt-continue'));
      await waitFor(() => expect(screen.getByTestId('tracking-end-trip')).toBeTruthy());

      fireEvent.press(screen.getByTestId('tracking-end-trip'));

      await waitFor(() => expect(mockStopBackgroundTracking).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByTestId('tracking-start-trip')).toBeTruthy());
    });
  });

  describe('permission-revoked banner (Task E.2)', () => {
    it('is hidden by default and appears when location.ts reports a revocation', () => {
      render(<TrackingScreen route={route} navigation={navigation} />);
      expect(screen.queryByTestId('tracking-permission-revoked-banner')).toBeNull();

      act(() => permissionRevokedListener?.(true));

      expect(screen.getByTestId('tracking-permission-revoked-banner')).toBeTruthy();
    });

    it('clears once location.ts reports the permission was re-granted', () => {
      render(<TrackingScreen route={route} navigation={navigation} />);

      act(() => permissionRevokedListener?.(true));
      expect(screen.getByTestId('tracking-permission-revoked-banner')).toBeTruthy();

      act(() => permissionRevokedListener?.(false));
      expect(screen.queryByTestId('tracking-permission-revoked-banner')).toBeNull();
    });

    it('unsubscribes the permission-revoked listener on unmount', () => {
      const { unmount } = render(<TrackingScreen route={route} navigation={navigation} />);
      unmount();

      expect(unsubscribePermissionRevoked).toHaveBeenCalledTimes(1);
    });
  });

  describe('connection ownership while a trip is active (Task E.2)', () => {
    it('does NOT leave the room on unmount while a background trip is actively tracking', async () => {
      mockGetTrackingStatus.mockReturnValue({
        isTracking: true,
        loadId: 'load-1',
        vehicleId: 'vehicle-1',
        lastEmittedAt: null,
        bufferedCount: 0,
        permissionRevoked: false,
      });

      const { unmount } = render(<TrackingScreen route={route} navigation={navigation} />);
      await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledTimes(1));

      unmount();

      expect(mockLeaveRoom).not.toHaveBeenCalled();
    });
  });
});
