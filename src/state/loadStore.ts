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
  // Set only after a confirmed successful POST /loads (task D.1) — read by
  // MatchResultsScreen (D.2) to know which load's matches to fetch. Never
  // set optimistically/pre-confirmation, since downstream matching depends
  // on a real load_id existing.
  activeLoadId: string | null;
  matches: MatchResult[];
  /**
   * Which `loadId` `matches` was fetched for (task D.2's brief-cache
   * requirement). `MatchResultsScreen` skips re-fetching on mount when
   * this already equals the current route's `loadId`; pull-to-refresh and
   * `invalidateMatches()` both force a fresh fetch regardless.
   */
  matchesLoadId: string | null;
  selectedVehicleId: string | null;
  quote: FareQuote | null;
  acceptedMatch: AcceptedMatch | null;
  documents: ShipmentDocumentsState;
  checkpoints: CheckpointsState;
  container: ContainerState;

  // --- Async status (scaffolded now to avoid a breaking shape change
  //     when Cluster B/D wire in real API calls) ---
  isLoadingMatches: boolean;
  matchesError: string | null;
  isLoadingQuote: boolean;
  quoteError: string | null;
  isAccepting: boolean;
  acceptError: string | null;
  isPosting: boolean;
  postError: string | null;

  // --- Actions ---
  setDraft: (draft: Partial<LoadDraft>) => void;
  clearDraft: () => void;
  setActiveLoadId: (loadId: string | null) => void;
  setMatches: (loadId: string, matches: MatchResult[]) => void;
  /** Forces the next `MatchResultsScreen` mount to re-fetch even though
   * `matchesLoadId` still points at the current load — used by the
   * accept-conflict recovery path, since the cached list is known-stale
   * (a match in it just came back unavailable). */
  invalidateMatches: () => void;
  setMatchesError: (error: string | null) => void;
  setIsLoadingMatches: (loading: boolean) => void;
  selectVehicle: (vehicleId: string | null) => void;
  setQuote: (quote: FareQuote | null) => void;
  setQuoteError: (error: string | null) => void;
  setIsLoadingQuote: (loading: boolean) => void;
  setAcceptedMatch: (match: AcceptedMatch | null) => void;
  setAcceptError: (error: string | null) => void;
  setIsAccepting: (accepting: boolean) => void;
  setPostError: (error: string | null) => void;
  setIsPosting: (posting: boolean) => void;
}

const initialDraft: LoadDraft = {};

export const useLoadStore = create<LoadState>()((set) => ({
  draft: initialDraft,
  activeLoadId: null,
  matches: [],
  matchesLoadId: null,
  selectedVehicleId: null,
  quote: null,
  acceptedMatch: null,
  documents: {},
  checkpoints: {},
  container: {},

  isLoadingMatches: false,
  matchesError: null,
  isLoadingQuote: false,
  quoteError: null,
  isAccepting: false,
  acceptError: null,
  isPosting: false,
  postError: null,

  setDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),

  clearDraft: () => set({ draft: initialDraft }),

  setActiveLoadId: (activeLoadId) => set({ activeLoadId }),

  setMatches: (loadId, matches) =>
    set({ matches, matchesLoadId: loadId, isLoadingMatches: false, matchesError: null }),

  invalidateMatches: () => set({ matchesLoadId: null }),

  setMatchesError: (matchesError) => set({ matchesError, isLoadingMatches: false }),

  setIsLoadingMatches: (isLoadingMatches) => set({ isLoadingMatches }),

  selectVehicle: (selectedVehicleId) => set({ selectedVehicleId }),

  setQuote: (quote) => set({ quote, isLoadingQuote: false, quoteError: null }),

  setQuoteError: (quoteError) => set({ quoteError, isLoadingQuote: false }),

  setIsLoadingQuote: (isLoadingQuote) => set({ isLoadingQuote }),

  // Accepting a match is the draft->accepted transition: the load has
  // moved from "being composed/matched" to "in flight", so the working
  // composition state (draft, matches, selection, quote) is cleared.
  setAcceptedMatch: (acceptedMatch) =>
    set({
      acceptedMatch,
      draft: initialDraft,
      matches: [],
      matchesLoadId: null,
      selectedVehicleId: null,
      quote: null,
      isAccepting: false,
      acceptError: null,
    }),

  setAcceptError: (acceptError) => set({ acceptError, isAccepting: false }),

  setIsAccepting: (isAccepting) => set({ isAccepting }),

  setPostError: (postError) => set({ postError }),
  setIsPosting: (isPosting) => set({ isPosting }),
}));

// Fine-grained selector hooks.
export const useLoadDraft = () => useLoadStore((s) => s.draft);
export const useActiveLoadId = () => useLoadStore((s) => s.activeLoadId);
export const useMatches = () => useLoadStore((s) => s.matches);
export const useSelectedVehicleId = () => useLoadStore((s) => s.selectedVehicleId);
export const useQuote = () => useLoadStore((s) => s.quote);
export const useAcceptedMatch = () => useLoadStore((s) => s.acceptedMatch);
export const usePostError = () => useLoadStore((s) => s.postError);
