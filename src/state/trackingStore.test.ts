import { useTrackingStore } from './trackingStore';

function resetStore() {
  useTrackingStore.setState({
    currentPosition: null,
    connectionState: 'connecting',
    lastUpdatedAt: null,
  });
}

describe('trackingStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts with null position, connecting state, and no lastUpdatedAt', () => {
    const state = useTrackingStore.getState();
    expect(state.currentPosition).toBeNull();
    expect(state.connectionState).toBe('connecting');
    expect(state.lastUpdatedAt).toBeNull();
  });

  describe('updatePosition — REPLACE semantics, not append', () => {
    it('sets currentPosition, lastUpdatedAt, and flips connectionState to live', () => {
      useTrackingStore.getState().updatePosition({ latitude: 18.5, longitude: 73.8 }, '2026-01-01T00:00:00.000Z');

      const state = useTrackingStore.getState();
      expect(state.currentPosition).toEqual({ latitude: 18.5, longitude: 73.8 });
      expect(state.lastUpdatedAt).toBe('2026-01-01T00:00:00.000Z');
      expect(state.connectionState).toBe('live');
    });

    it('a second update REPLACES the position rather than accumulating a trail', () => {
      useTrackingStore.getState().updatePosition({ latitude: 18.5, longitude: 73.8 }, '2026-01-01T00:00:00.000Z');
      useTrackingStore.getState().updatePosition({ latitude: 18.6, longitude: 73.9 }, '2026-01-01T00:00:07.000Z');

      const state = useTrackingStore.getState();
      expect(state.currentPosition).toEqual({ latitude: 18.6, longitude: 73.9 });
      expect(state.lastUpdatedAt).toBe('2026-01-01T00:00:07.000Z');
    });

    it('defaults lastUpdatedAt to "now" when no timestamp is provided', () => {
      const before = Date.now();
      useTrackingStore.getState().updatePosition({ latitude: 1, longitude: 2 });
      const after = Date.now();

      const lastUpdatedAt = useTrackingStore.getState().lastUpdatedAt;
      expect(lastUpdatedAt).not.toBeNull();
      const ts = new Date(lastUpdatedAt as string).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('setConnectionState — transition logic', () => {
    it.each([['connecting'], ['live'], ['reconnecting'], ['lost']] as const)(
      'sets connectionState to %s',
      (next) => {
        useTrackingStore.getState().setConnectionState(next);
        expect(useTrackingStore.getState().connectionState).toBe(next);
      }
    );

    it('does not touch currentPosition or lastUpdatedAt', () => {
      useTrackingStore.getState().updatePosition({ latitude: 1, longitude: 2 }, '2026-01-01T00:00:00.000Z');
      useTrackingStore.getState().setConnectionState('reconnecting');

      const state = useTrackingStore.getState();
      expect(state.currentPosition).toEqual({ latitude: 1, longitude: 2 });
      expect(state.lastUpdatedAt).toBe('2026-01-01T00:00:00.000Z');
      expect(state.connectionState).toBe('reconnecting');
    });
  });

  describe('reset', () => {
    it('clears position, lastUpdatedAt, and connectionState back to initial values', () => {
      useTrackingStore.getState().updatePosition({ latitude: 1, longitude: 2 }, '2026-01-01T00:00:00.000Z');
      useTrackingStore.getState().setConnectionState('lost');

      useTrackingStore.getState().reset();

      const state = useTrackingStore.getState();
      expect(state.currentPosition).toBeNull();
      expect(state.connectionState).toBe('connecting');
      expect(state.lastUpdatedAt).toBeNull();
    });
  });
});
