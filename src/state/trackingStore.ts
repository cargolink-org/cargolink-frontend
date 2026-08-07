// src/state/trackingStore.ts
//
// trackingStore — live vehicle position + Socket.io connection lifecycle.
// This is the store most sensitive to the selective-subscription
// requirement: once Cluster E wires real 5-10s location pings, a naive
// whole-store subscription here would re-render every screen that
// happens to import this store. The fine-grained hooks at the bottom of
// this file exist specifically to prevent that.

import { create } from 'zustand';
import type { ConnectionState, LatLng } from './types';

interface TrackingState {
  currentPosition: LatLng | null;
  connectionState: ConnectionState;
  lastUpdatedAt: string | null;

  updatePosition: (position: LatLng, timestamp?: string) => void;
  setConnectionState: (state: ConnectionState) => void;
  reset: () => void;
}

const initial = {
  currentPosition: null as LatLng | null,
  connectionState: 'connecting' as ConnectionState,
  lastUpdatedAt: null as string | null,
};

export const useTrackingStore = create<TrackingState>()((set) => ({
  ...initial,

  // REPLACE semantics, not append: each ping overwrites the previous
  // position. A full historical polyline (if ever needed) is fetched
  // separately via GET /tracking/{vehicleId} in Cluster E — this store
  // only ever needs to know "where is the vehicle right now."
  updatePosition: (position, timestamp) =>
    set({
      currentPosition: position,
      lastUpdatedAt: timestamp ?? new Date().toISOString(),
      connectionState: 'live',
    }),

  setConnectionState: (connectionState) => set({ connectionState }),

  reset: () => set({ ...initial }),
}));

// Fine-grained selector hooks — REQUIRED architectural pattern (not an
// optimization to add later). Screens should subscribe to exactly the
// slice they render.
export const useTrackingPosition = () => useTrackingStore((s) => s.currentPosition);
export const useTrackingConnectionState = () => useTrackingStore((s) => s.connectionState);
export const useTrackingLastUpdatedAt = () => useTrackingStore((s) => s.lastUpdatedAt);
