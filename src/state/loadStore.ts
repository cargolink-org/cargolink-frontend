// src/state/loadStore.ts
//
// loadStore intentionally mixes two conceptually distinct kinds of state
// in one object (per the Task A.2 architecture requirement, documented
// inline rather than split into separate stores, since screens in
// Cluster D need both together):
//
//   - PURE UI STATE:      `draft` — the in-progress load-posting form.
//   - SERVER-DERIVED:     `matches`, `selectedVehicleId`, `quote`,
//                         `acceptedMatch`, `documents`, `checkpoints`,
//                         `container` — all populated from future API
//                         responses (Cluster D/F), never invented here.
//
// `documents` / `checkpoints` / `container` are empty/typed placeholders
// for Cluster F — this task only needs their shape to exist so later
// clusters don't require a breaking store-shape change.

import { create } from 'zustand';
import type {
  LoadDraft,
  MatchResult,
  FareQuote,
  AcceptedMatch,
  ShipmentDocumentsState,
  CheckpointsState,
  ContainerState,
} from './types';

interface LoadState {
  // --- Pure UI/form state ---
  draft: LoadDraft;

  // --- Server-derived state ---
  matches: MatchResult[];
  selectedVehicleId: string | null;
  quote: FareQuote | null;
  acceptedMatch: AcceptedMatch | null;
  documents: ShipmentDocumentsState;
  checkpoints: CheckpointsState;
  container: ContainerState;

  // --- Async status (scaffolded now to avoid a breaking shape change
  //     when Cluster B/D wire in real API calls) ---
  isLoadingMatches: boolean;
  isPosting: boolean;
  postError: string | null;

  // --- Actions ---
  setDraft: (draft: Partial<LoadDraft>) => void;
  clearDraft: () => void;
  setMatches: (matches: MatchResult[]) => void;
  selectVehicle: (vehicleId: string | null) => void;
  setQuote: (quote: FareQuote | null) => void;
  setAcceptedMatch: (match: AcceptedMatch | null) => void;
  setPostError: (error: string | null) => void;
  setIsPosting: (posting: boolean) => void;
  setIsLoadingMatches: (loading: boolean) => void;
}

const initialDraft: LoadDraft = {};

export const useLoadStore = create<LoadState>()((set) => ({
  draft: initialDraft,
  matches: [],
  selectedVehicleId: null,
  quote: null,
  acceptedMatch: null,
  documents: {},
  checkpoints: {},
  container: {},

  isLoadingMatches: false,
  isPosting: false,
  postError: null,

  setDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),

  clearDraft: () => set({ draft: initialDraft }),

  setMatches: (matches) => set({ matches, isLoadingMatches: false }),

  selectVehicle: (selectedVehicleId) => set({ selectedVehicleId }),

  setQuote: (quote) => set({ quote }),

  // Accepting a match is the draft->accepted transition: the load has
  // moved from "being composed/matched" to "in flight", so the working
  // composition state (draft, matches, selection, quote) is cleared.
  setAcceptedMatch: (acceptedMatch) =>
    set({
      acceptedMatch,
      draft: initialDraft,
      matches: [],
      selectedVehicleId: null,
      quote: null,
    }),

  setPostError: (postError) => set({ postError }),
  setIsPosting: (isPosting) => set({ isPosting }),
  setIsLoadingMatches: (isLoadingMatches) => set({ isLoadingMatches }),
}));

// Fine-grained selector hooks.
export const useLoadDraft = () => useLoadStore((s) => s.draft);
export const useMatches = () => useLoadStore((s) => s.matches);
export const useSelectedVehicleId = () => useLoadStore((s) => s.selectedVehicleId);
export const useQuote = () => useLoadStore((s) => s.quote);
export const useAcceptedMatch = () => useLoadStore((s) => s.acceptedMatch);
export const usePostError = () => useLoadStore((s) => s.postError);
