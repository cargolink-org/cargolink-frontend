import { io } from 'socket.io-client';

import * as sockets from './sockets';
import { useAuthStore } from '../state/authStore';

/**
 * `socket.io-client` is fully mocked here — `sockets.ts`'s real-mode path
 * is exercised against a hand-built fake socket (`createFakeSocket`)
 * rather than a real connection. The MOCK_MODE (simulated-emitter) path
 * is exercised via `__setMockModeForTests`, which sidesteps the
 * babel-env-var-inlining constraint documented at the top of sockets.ts.
 */
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

const mockIo = io as jest.Mock;

/** A minimal fake matching the subset of the real `Socket` interface
 * `sockets.ts` actually uses. `removeAllListeners()` genuinely clears the
 * internal handler map (unlike a bare jest.fn()) so a reused mock
 * instance across simulated "reconnects" behaves like a real socket would
 * — otherwise handlers would silently accumulate across reconnects and
 * every subsequent `__trigger` would fire stale, duplicate callbacks. */
function createFakeSocket() {
  let handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(() => {
      handlers = {};
    }),
    __trigger(event: string, ...args: unknown[]) {
      (handlers[event] ?? []).forEach((cb) => cb(...args));
    },
  };
}

function resetAuthStore() {
  useAuthStore.setState({
    token: 'token-a',
    refreshToken: 'refresh-a',
    user: { id: 'u1', phone: '9999999999', role: 'shipper' },
    role: 'shipper',
    isNewUser: false,
    isAuthenticated: true,
    isHydrated: true,
    logoutReason: null,
  });
}

describe('sockets.ts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIo.mockReset();
    sockets.__resetForTests();
    resetAuthStore();
  });

  afterEach(() => {
    sockets.leaveRoom();
    sockets.__resetForTests();
    jest.useRealTimers();
  });

  describe('MOCK_MODE (simulated emitter)', () => {
    beforeEach(() => {
      sockets.__setMockModeForTests(true);
    });

    it('reaches live and dispatches location updates on the expected cadence', () => {
      const locations: sockets.LocationUpdatePayload[] = [];
      sockets.onLocationUpdate((p) => locations.push(p));

      sockets.joinRoom('load-1');
      expect(sockets.getConnectionState()).toBe('connecting');

      jest.advanceTimersByTime(300);
      expect(sockets.getConnectionState()).toBe('live');
      expect(locations).toHaveLength(1);

      jest.advanceTimersByTime(7000);
      expect(locations).toHaveLength(2);
      expect(locations[0]).toEqual(expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }));
    });

    it('simulateDisconnect drives live -> reconnecting -> live without tearing down the room', () => {
      sockets.joinRoom('load-1');
      jest.advanceTimersByTime(300);
      expect(sockets.getConnectionState()).toBe('live');

      sockets.__simulateDisconnect();
      expect(sockets.getConnectionState()).toBe('reconnecting');

      jest.advanceTimersByTime(2500);
      expect(sockets.getConnectionState()).toBe('live');
    });

    it('simulateStaleConnection pauses emission without changing connectionState', () => {
      const locations: unknown[] = [];
      sockets.onLocationUpdate((p) => locations.push(p));

      sockets.joinRoom('load-1');
      jest.advanceTimersByTime(300);
      const countAtStale = locations.length;
      expect(sockets.getConnectionState()).toBe('live');

      sockets.__simulateStaleConnection();
      jest.advanceTimersByTime(30_000);

      expect(locations.length).toBe(countAtStale); // no further emissions
      expect(sockets.getConnectionState()).toBe('live'); // state itself untouched
    });

    it('leaveRoom stops the emitter — no further updates after leaving', () => {
      const locations: unknown[] = [];
      sockets.onLocationUpdate((p) => locations.push(p));

      sockets.joinRoom('load-1');
      jest.advanceTimersByTime(300);
      const countBeforeLeave = locations.length;

      sockets.leaveRoom();
      jest.advanceTimersByTime(20_000);

      expect(locations.length).toBe(countBeforeLeave);
      expect(sockets.getConnectionState()).toBe('connecting');
    });
  });

  describe('real mode (mocked socket.io-client)', () => {
    beforeEach(() => {
      sockets.__setMockModeForTests(false);
    });

    it('connects with the current auth token and reports live on connect', () => {
      const fakeSocket = createFakeSocket();
      mockIo.mockReturnValue(fakeSocket);

      sockets.joinRoom('load-1');

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ auth: { token: 'token-a' } })
      );

      fakeSocket.__trigger('connect');
      expect(sockets.getConnectionState()).toBe('live');
      expect(fakeSocket.emit).toHaveBeenCalledWith('join', { room: 'load:load-1' });
    });

    it('dispatches location:update events to subscribers', () => {
      const fakeSocket = createFakeSocket();
      mockIo.mockReturnValue(fakeSocket);
      const locations: sockets.LocationUpdatePayload[] = [];
      sockets.onLocationUpdate((p) => locations.push(p));

      sockets.joinRoom('load-1');
      fakeSocket.__trigger('connect');
      fakeSocket.__trigger('location:update', { lat: 1, lng: 2, ts: 'now' });

      expect(locations).toEqual([{ lat: 1, lng: 2, ts: 'now' }]);
    });

    it('schedules a backoff reconnect on disconnect while a room is joined, and eventually reports lost', () => {
      const fakeSocket = createFakeSocket();
      mockIo.mockReturnValue(fakeSocket);

      sockets.joinRoom('load-1');
      fakeSocket.__trigger('connect');
      expect(sockets.getConnectionState()).toBe('live');

      // MAX_RECONNECT_ATTEMPTS is 5 and the exhaustion check happens
      // BEFORE incrementing, so it takes 6 consecutive failures
      // (attempts 0..5 checked) to exhaust the budget and land on 'lost'.
      for (let i = 0; i < 6; i += 1) {
        fakeSocket.__trigger('disconnect');
        if (i < 5) {
          expect(sockets.getConnectionState()).toBe('reconnecting');
          jest.advanceTimersByTime(20_000); // comfortably past any backoff tier
        }
      }

      expect(sockets.getConnectionState()).toBe('lost');
    });

    it('does not schedule a reconnect after an intentional leaveRoom()', () => {
      const fakeSocket = createFakeSocket();
      mockIo.mockReturnValue(fakeSocket);

      sockets.joinRoom('load-1');
      fakeSocket.__trigger('connect');
      sockets.leaveRoom();

      expect(fakeSocket.disconnect).toHaveBeenCalled();
      expect(fakeSocket.removeAllListeners).toHaveBeenCalled();

      // A disconnect event arriving after an intentional leave (e.g. a
      // slow/late event) must not resurrect reconnect logic.
      fakeSocket.__trigger('disconnect');
      jest.advanceTimersByTime(60_000);
      expect(mockIo).toHaveBeenCalledTimes(1); // never reconnected
    });

    it('re-authenticates (reconnects with the new token) after a token rotation while a room is joined', () => {
      const fakeSocket1 = createFakeSocket();
      const fakeSocket2 = createFakeSocket();
      mockIo.mockReturnValueOnce(fakeSocket1).mockReturnValueOnce(fakeSocket2);

      sockets.joinRoom('load-1');
      fakeSocket1.__trigger('connect');
      expect(mockIo).toHaveBeenCalledTimes(1);

      useAuthStore.getState().setAccessToken('token-b');

      expect(mockIo).toHaveBeenCalledTimes(2);
      expect(mockIo).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ auth: { token: 'token-b' } })
      );
      // The stale connection must be torn down, not left dangling.
      expect(fakeSocket1.disconnect).toHaveBeenCalled();
    });

    it('does not reconnect on a token rotation when no room is joined', () => {
      useAuthStore.getState().setAccessToken('token-b');
      expect(mockIo).not.toHaveBeenCalled();
    });
  });

  describe('emitLocationUpdate (Task E.2 — outgoing send path)', () => {
    it('MOCK_MODE: always returns true (no real transmission target yet, Sprint 4 scope)', () => {
      sockets.__setMockModeForTests(true);
      sockets.joinRoom('load-1');
      jest.advanceTimersByTime(300);

      const sent = sockets.emitLocationUpdate({
        load_id: 'load-1',
        vehicle_id: 'veh-1',
        lat: 12.9,
        lng: 77.6,
        ts: 'now',
      });

      expect(sent).toBe(true);
    });

    it('real mode, connected: emits location_update on the socket and returns true', () => {
      sockets.__setMockModeForTests(false);
      const fakeSocket = createFakeSocket();
      mockIo.mockReturnValue(fakeSocket);

      sockets.joinRoom('load-1');
      fakeSocket.__trigger('connect');

      const payload = { load_id: 'load-1', vehicle_id: 'veh-1', lat: 12.9, lng: 77.6, ts: 'now' };
      const sent = sockets.emitLocationUpdate(payload);

      expect(sent).toBe(true);
      expect(fakeSocket.emit).toHaveBeenCalledWith('location_update', payload);
    });

    it('real mode, not connected (no room joined): returns false without throwing', () => {
      sockets.__setMockModeForTests(false);

      const sent = sockets.emitLocationUpdate({
        load_id: 'load-1',
        vehicle_id: 'veh-1',
        lat: 12.9,
        lng: 77.6,
        ts: 'now',
      });

      expect(sent).toBe(false);
    });

    it('real mode, disconnected mid-trip: returns false once connectionState drops out of live', () => {
      sockets.__setMockModeForTests(false);
      const fakeSocket = createFakeSocket();
      mockIo.mockReturnValue(fakeSocket);

      sockets.joinRoom('load-1');
      fakeSocket.__trigger('connect');
      fakeSocket.__trigger('disconnect');
      expect(sockets.getConnectionState()).toBe('reconnecting');

      const sent = sockets.emitLocationUpdate({
        load_id: 'load-1',
        vehicle_id: 'veh-1',
        lat: 12.9,
        lng: 77.6,
        ts: 'now',
      });

      expect(sent).toBe(false);
    });
  });

  describe('listener cleanup', () => {
    it('onLocationUpdate/onConnectionStateChange unsubscribe functions stop further delivery', () => {
      sockets.__setMockModeForTests(true);
      const locations: unknown[] = [];
      const unsubscribe = sockets.onLocationUpdate((p) => locations.push(p));

      sockets.joinRoom('load-1');
      jest.advanceTimersByTime(300);
      expect(locations).toHaveLength(1);

      unsubscribe();
      jest.advanceTimersByTime(7000);
      expect(locations).toHaveLength(1); // no further deliveries after unsubscribe
    });

    it('repeated join/leave cycles tear down each socket before the next connects (no accumulation)', () => {
      sockets.__setMockModeForTests(false);
      const socketA = createFakeSocket();
      const socketB = createFakeSocket();
      const socketC = createFakeSocket();
      mockIo.mockReturnValueOnce(socketA).mockReturnValueOnce(socketB).mockReturnValueOnce(socketC);

      sockets.joinRoom('load-1');
      sockets.leaveRoom();
      sockets.joinRoom('load-2');
      sockets.leaveRoom();
      sockets.joinRoom('load-3');

      expect(socketA.removeAllListeners).toHaveBeenCalled();
      expect(socketB.removeAllListeners).toHaveBeenCalled();
      expect(socketC.removeAllListeners).not.toHaveBeenCalled(); // still active
      expect(mockIo).toHaveBeenCalledTimes(3);
    });
  });
});
