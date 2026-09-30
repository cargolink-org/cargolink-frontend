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
//                         `container` — all populated from API responses
//                         (Cluster D/F), never invented here.
//
// `documents` / `checkpoints` / `container` (Task F.1) are `Record<loadId,
// ...>` maps rather than single values, per this task's explicit state-
// shape instruction — both shipper and transporter can view these screens
// for the same load, and a single unkeyed value would let one load's data
// leak into another's view if the app ever navigates between loads within
// one session (e.g. a transporter with more than one active haul). Each
// map has a matching `*Loading`/`*Error` map, keyed the same way, mirroring
// the `isLoadingMatches`/`matchesError` pattern already established below
// for `matches` — kept as sibling maps rather than nesting loading/error
// inside the record's value type so `setXLoading`/`setXError` don't need
// to read-modify-write the data map itself.

import { create } from 'zustand';
import type {
  LoadDraft,
  MatchResult,
  FareQuote,
  AcceptedMatch,
  ShipmentDocument,
  CheckpointUpdate,
  ContainerDetails,
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

  // --- Task F.1 — keyed by load_id (see top-of-file comment) ---
  documents: Record<string, ShipmentDocument[]>;
  documentsLoading: Record<string, boolean>;
  documentsError: Record<string, string | null>;
  checkpoints: Record<string, CheckpointUpdate[]>;
  checkpointsLoading: Record<string, boolean>;
  checkpointsError: Record<string, string | null>;
  /** `undefined` = not yet fetched; `null` = fetched, no container record
   * (not applicable to this load); a value = the fetched record. */
  container: Record<string, ContainerDetails | null>;
  containerLoading: Record<string, boolean>;
  containerError: Record<string, string | null>;

  // --- Task G.1 — keyed by load_id (see top-of-file comment). A single
  // lightweight map rather than a dedicated ratingStore, per the task's
  // own explicit allowance ("a minimal new ratingStore if cleaner — use
  // judgment") — RatingScreen is the only consumer and the value is one
  // small object per load, not worth its own store. No loading/error
  // sibling maps here (unlike documents/checkpoints/container above):
  // there is no GET to fetch a rating back in this task's scope, only a
  // POST whose in-flight/error state is screen-local (`isSubmitting`/
  // `submitError`), matching the task's "keep it consistent... but use
  // judgment" guidance. `undefined` = not known to be rated yet this
  // session (RatingForm renders submittable mode); a value = a rating was
  // successfully submitted this session (RatingForm renders read-only).
  ratingSubmitted: Record<string, { score: number; comment?: string }>;

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

  // --- Task F.1 actions ---
  setDocuments: (loadId: string, documents: ShipmentDocument[]) => void;
  setDocumentsLoading: (loadId: string, loading: boolean) => void;
  setDocumentsError: (loadId: string, error: string | null) => void;
  setCheckpoints: (loadId: string, checkpoints: CheckpointUpdate[]) => void;
  setCheckpointsLoading: (loadId: string, loading: boolean) => void;
  setCheckpointsError: (loadId: string, error: string | null) => void;
  /** Appends one confirmed checkpoint update (the server's response to a
   * successful POST) rather than replacing the whole list — used instead
   * of a full re-fetch so a transporter's own just-posted update appears
   * immediately without a round-trip, while still only reflecting
   * server-confirmed data (no optimistic pre-confirmation entry is ever
   * added — task F.1's explicit "no optimistic updates" requirement). */
  appendCheckpoint: (loadId: string, update: CheckpointUpdate) => void;
  setContainer: (loadId: string, container: ContainerDetails | null) => void;
  setContainerLoading: (loadId: string, loading: boolean) => void;
  setContainerError: (loadId: string, error: string | null) => void;

  // --- Task G.1 action ---
  /** Marks `loadId` as rated this session with `{ score, comment }` —
   * called only after a server-confirmed successful `POST /ratings`
   * (see RatingScreen.tsx), matching the project-wide "no optimistic
   * updates" convention (never called speculatively before the request
   * resolves). */
  setRatingSubmitted: (loadId: string, rating: { score: number; comment?: string }) => void;
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
  documentsLoading: {},
  documentsError: {},
  checkpoints: {},
  checkpointsLoading: {},
  checkpointsError: {},
  container: {},
  containerLoading: {},
  containerError: {},
  ratingSubmitted: {},

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

  // --- Task F.1 actions — each keyed map is updated via a shallow spread
  // keyed by loadId, matching the Record<loadId, ...> shape above. ---
  setDocuments: (loadId, documents) =>
    set((s) => ({
      documents: { ...s.documents, [loadId]: documents },
      documentsLoading: { ...s.documentsLoading, [loadId]: false },
      documentsError: { ...s.documentsError, [loadId]: null },
    })),

  setDocumentsLoading: (loadId, loading) =>
    set((s) => ({ documentsLoading: { ...s.documentsLoading, [loadId]: loading } })),

  setDocumentsError: (loadId, error) =>
    set((s) => ({
      documentsError: { ...s.documentsError, [loadId]: error },
      documentsLoading: { ...s.documentsLoading, [loadId]: false },
    })),

  setCheckpoints: (loadId, checkpoints) =>
    set((s) => ({
      checkpoints: { ...s.checkpoints, [loadId]: checkpoints },
      checkpointsLoading: { ...s.checkpointsLoading, [loadId]: false },
      checkpointsError: { ...s.checkpointsError, [loadId]: null },
    })),

  setCheckpointsLoading: (loadId, loading) =>
    set((s) => ({ checkpointsLoading: { ...s.checkpointsLoading, [loadId]: loading } })),

  setCheckpointsError: (loadId, error) =>
    set((s) => ({
      checkpointsError: { ...s.checkpointsError, [loadId]: error },
      checkpointsLoading: { ...s.checkpointsLoading, [loadId]: false },
    })),

  appendCheckpoint: (loadId, update) =>
    set((s) => ({
      checkpoints: { ...s.checkpoints, [loadId]: [...(s.checkpoints[loadId] ?? []), update] },
    })),

  setContainer: (loadId, container) =>
    set((s) => ({
      container: { ...s.container, [loadId]: container },
      containerLoading: { ...s.containerLoading, [loadId]: false },
      containerError: { ...s.containerError, [loadId]: null },
    })),

  setContainerLoading: (loadId, loading) =>
    set((s) => ({ containerLoading: { ...s.containerLoading, [loadId]: loading } })),

  setContainerError: (loadId, error) =>
    set((s) => ({
      containerError: { ...s.containerError, [loadId]: error },
      containerLoading: { ...s.containerLoading, [loadId]: false },
    })),

  // --- Task G.1 action ---
  setRatingSubmitted: (loadId, rating) =>
    set((s) => ({ ratingSubmitted: { ...s.ratingSubmitted, [loadId]: rating } })),
}));

// Fine-grained selector hooks.
export const useLoadDraft = () => useLoadStore((s) => s.draft);
export const useActiveLoadId = () => useLoadStore((s) => s.activeLoadId);
export const useMatches = () => useLoadStore((s) => s.matches);
export const useSelectedVehicleId = () => useLoadStore((s) => s.selectedVehicleId);
export const useQuote = () => useLoadStore((s) => s.quote);
export const useAcceptedMatch = () => useLoadStore((s) => s.acceptedMatch);
export const usePostError = () => useLoadStore((s) => s.postError);

// --- Task F.1 fine-grained selector hooks — each takes the loadId so a
// screen only re-renders when its own load's slice changes, not on every
// other load's update (relevant once a transporter has more than one
// active haul in-session). ---
export const useShipmentDocuments = (loadId: string) =>
  useLoadStore((s) => s.documents[loadId]);
export const useShipmentDocumentsLoading = (loadId: string) =>
  useLoadStore((s) => s.documentsLoading[loadId] ?? false);
export const useShipmentDocumentsError = (loadId: string) =>
  useLoadStore((s) => s.documentsError[loadId] ?? null);

export const useCheckpoints = (loadId: string) => useLoadStore((s) => s.checkpoints[loadId]);
export const useCheckpointsLoading = (loadId: string) =>
  useLoadStore((s) => s.checkpointsLoading[loadId] ?? false);
export const useCheckpointsError = (loadId: string) =>
  useLoadStore((s) => s.checkpointsError[loadId] ?? null);

export const useContainer = (loadId: string) => useLoadStore((s) => s.container[loadId]);
export const useContainerLoading = (loadId: string) =>
  useLoadStore((s) => s.containerLoading[loadId] ?? false);
export const useContainerError = (loadId: string) =>
  useLoadStore((s) => s.containerError[loadId] ?? null);

// --- Task G.1 fine-grained selector hook ---
export const useRatingSubmitted = (loadId: string) =>
  useLoadStore((s) => s.ratingSubmitted[loadId]);
