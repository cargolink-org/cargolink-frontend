import { apiClient } from './client';
import { toApiError } from '../utils/errorMessages';
import type { CheckpointName, CheckpointStatus, CheckpointUpdate } from '../state/types';

// See src/api/vehicles.ts for the same ASSUMPTION note on `apiClient` and
// `MOCK_MODE` — kept consistent across both files until confirmed.
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

/**
 * ASSUMPTION (flag for review at contract freeze): the technical spec's
 * "Core API Endpoints" list (§5) only shows `POST /checkpoints/{loadId}`
 * — there is no listed `GET` for reading a load's checkpoint history back.
 * This task's own spec nonetheless requires `CheckpointTimelineScreen` to
 * fetch checkpoint history on mount ("On mount, fetch checkpoint history
 * via a documents/checkpoints-scoped fetch (GET on checkpoints for this
 * load, per contract)"). `GET /checkpoints/{loadId}` below is a
 * reasonably-inferred route, matching the sibling `GET
 * /documents/{loadId}` pattern already confirmed for shipment documents —
 * flag with Dinesh alongside the container-endpoint assumption in
 * `api/documents.ts`.
 */
export interface PostCheckpointResponse {
  checkpoint_id: string;
}

function mockCheckpointFixture(loadId: string): CheckpointUpdate[] {
  // Three canned histories, selected by loadId, so screen/component tests
  // can exercise a normal in-order history, an out-of-order history (the
  // explicit required edge case), and an empty/just-started history
  // without needing a live backend.
  if (loadId === 'mock-load-out-of-order') {
    // Deliberately out of sequence: 'cleared' (index 3) is marked
    // completed before 'customs_hold' (index 2) — Timeline must still
    // render without breaking layout.
    return [
      { checkpoint_id: 'cp-1', checkpoint_name: 'origin_warehouse', status: 'completed', timestamp: '2026-09-01T08:00:00Z' },
      { checkpoint_id: 'cp-2', checkpoint_name: 'port_border', status: 'completed', timestamp: '2026-09-02T10:00:00Z' },
      { checkpoint_id: 'cp-3', checkpoint_name: 'cleared', status: 'completed', timestamp: '2026-09-03T09:00:00Z' },
    ];
  }
  if (loadId === 'mock-load-empty') {
    return [];
  }
  // Default: normal in-order, partway through.
  return [
    { checkpoint_id: 'cp-1', checkpoint_name: 'origin_warehouse', status: 'completed', timestamp: '2026-09-01T08:00:00Z' },
    { checkpoint_id: 'cp-2', checkpoint_name: 'port_border', status: 'completed', timestamp: '2026-09-02T10:00:00Z' },
  ];
}

function mockGetCheckpoints(loadId: string): Promise<CheckpointUpdate[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCheckpointFixture(loadId)), 500);
  });
}

function mockPostCheckpoint(
  loadId: string,
  checkpointName: CheckpointName,
  status: CheckpointStatus
): Promise<PostCheckpointResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ checkpoint_id: `mock-checkpoint-${loadId}-${checkpointName}-${status}-${Date.now()}` });
    }, 500);
  });
}

export async function getCheckpoints(loadId: string): Promise<CheckpointUpdate[]> {
  if (MOCK_MODE) {
    return mockGetCheckpoints(loadId);
  }

  const { data } = await apiClient.get<CheckpointUpdate[]>(`/checkpoints/${loadId}`);
  return data;
}

export async function postCheckpoint(
  loadId: string,
  checkpointName: CheckpointName,
  status: CheckpointStatus
): Promise<PostCheckpointResponse> {
  if (MOCK_MODE) {
    return mockPostCheckpoint(loadId, checkpointName, status);
  }

  try {
    const { data } = await apiClient.post<PostCheckpointResponse>(`/checkpoints/${loadId}`, {
      checkpoint_name: checkpointName,
      status,
    });
    return data;
  } catch (err) {
    // Surface a role-mismatch (403) distinctly, per the task spec's
    // explicit "handle gracefully if it occurs" requirement, even though
    // the UI should never present this action to an unauthorized role.
    const status_ = (err as { response?: { status?: number } })?.response?.status;
    if (status_ === 403) {
      throw toApiError('CHECKPOINT_ROLE_FORBIDDEN', 403);
    }
    throw err;
  }
}
