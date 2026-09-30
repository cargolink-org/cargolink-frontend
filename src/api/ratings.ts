// src/api/ratings.ts
//
// Task G.1 — `POST /ratings` (technical spec, draft, pending Week 2
// freeze). Follows `api/checkpoints.ts`'s established shape for a
// single, low-surface-area POST action: one dispatch function that
// branches on `MOCK_MODE` inline, rather than the exported
// `xViaApi`/`xMock` pair used by the larger `api/loads.ts`/`api/pricing.ts`
// modules — there's no second call site here that needs to exercise the
// real-network path independent of the mock path.

import { apiClient } from './client';
import { toApiError } from '../utils/errorMessages';

// See src/api/checkpoints.ts for the same ASSUMPTION note on `apiClient`
// and `MOCK_MODE` — kept consistent across every api/ module until a
// shared src/config/env.ts is confirmed as the single source of truth.
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

/** Request body for `POST /ratings`, per the technical spec's `ratings`
 * table (`load_id, rater_id, ratee_id, score, comment`) — `rater_id` is
 * never sent from the client; it's derived server-side from the
 * authenticated session, same as every other endpoint's implicit
 * "current user" scoping in this codebase. */
export interface SubmitRatingPayload {
  load_id: string;
  ratee_id: string;
  score: number;
  comment?: string;
}

export interface SubmitRatingResponse {
  rating_id: string;
}

/**
 * Sentinel `load_id` used by mock mode / tests to simulate the server
 * rejecting a rating as a duplicate submission — per this task's explicit
 * "a special test load_id can simulate a duplicate-rating rejection for
 * test coverage" requirement. Mirrors `MOCK_CONFLICT_VEHICLE_ID`'s role in
 * `api/loads.ts`.
 */
export const MOCK_DUPLICATE_RATING_LOAD_ID = 'mock-load-already-rated';

function mockSubmitRating(payload: SubmitRatingPayload): Promise<SubmitRatingResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (payload.load_id === MOCK_DUPLICATE_RATING_LOAD_ID) {
        reject(toApiError('RATING_DUPLICATE', 409));
        return;
      }
      resolve({ rating_id: `mock-rating-${payload.load_id}-${Date.now()}` });
    }, 500);
  });
}

/**
 * Submits a post-trip rating. Resolves with `{ rating_id }` on success;
 * rejects with an `ApiError` (see `utils/errorMessages.ts`) on failure —
 * screens map that to a message via `getErrorMessage(err)`, same pattern
 * as `CheckpointTimelineScreen`'s `postCheckpoint` failure handling.
 */
export async function submitRating(payload: SubmitRatingPayload): Promise<SubmitRatingResponse> {
  if (MOCK_MODE) {
    return mockSubmitRating(payload);
  }

  try {
    const { data } = await apiClient.post<SubmitRatingResponse>('/ratings', payload);
    return data;
  } catch (err) {
    // A duplicate-rating rejection is the one failure mode this task's
    // spec calls out by name (Edge Cases: "user attempts to submit a
    // rating for a load already rated ... gracefully handled if the
    // server rejects it"). Mapped to `RATING_DUPLICATE` the same way
    // `api/checkpoints.ts` maps a role-mismatch rejection to
    // `CHECKPOINT_ROLE_FORBIDDEN` — a defensive path, since the UI
    // structurally shouldn't be able to reach this (RatingForm's
    // submittable mode never renders once a rating already exists).
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 409) {
      throw toApiError('RATING_DUPLICATE', 409);
    }
    throw err;
  }
}
