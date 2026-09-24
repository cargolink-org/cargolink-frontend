// src/utils/checkpointTimeline.ts
//
// Task F.1 — derives `Timeline`-ready steps from raw `CheckpointUpdate[]`
// history. Kept as a standalone, pure, directly-unit-testable function
// (not inline conditionals inside `CheckpointTimelineScreen`) so the
// out-of-order-data edge case can be verified without rendering.
//
// Algorithm: walk the CANONICAL sequence (`CHECKPOINT_NAMES`, not the
// order updates arrived in) once. Each stage is independently marked
// 'completed' if ANY update for it has status 'completed', regardless of
// where in the raw history that update appears. The first non-completed
// stage encountered (in canonical order) is 'current'; every stage after
// that is 'upcoming' unless it's independently already 'completed'. This
// means out-of-order data (e.g. 'cleared' completed before 'customs_hold')
// never crashes or reorders the rendered list — 'customs_hold' simply
// shows as 'current' (the earliest not-yet-completed stage) while
// 'cleared' downstream still shows 'completed', which is an honest
// reflection of a real data-quality anomaly rather than something this
// function tries to silently "fix".

import {
  CHECKPOINT_NAMES,
  CHECKPOINT_NAME_LABELS,
  type CheckpointUpdate,
} from '../state/types';
import { formatCheckpointTimestamp } from './formatters';
import type { TimelineStep } from '../components/Timeline';

export function computeTimelineSteps(checkpoints: CheckpointUpdate[]): TimelineStep[] {
  const latestTimestampByName = new Map<string, string | undefined>();
  const completedNames = new Set<string>();

  for (const update of checkpoints) {
    if (update.status === 'completed') {
      completedNames.add(update.checkpoint_name);
      // If more than one 'completed' update exists for the same stage
      // (shouldn't happen for a one-way MVP transition, but data can be
      // messy), keep the latest timestamp rather than crashing or picking
      // arbitrarily.
      const existing = latestTimestampByName.get(update.checkpoint_name);
      if (!existing || (update.timestamp && update.timestamp > existing)) {
        latestTimestampByName.set(update.checkpoint_name, update.timestamp);
      }
    }
  }

  let currentAssigned = false;

  return CHECKPOINT_NAMES.map((name) => {
    const isCompleted = completedNames.has(name);
    let state: TimelineStep['state'];
    if (isCompleted) {
      state = 'completed';
    } else if (!currentAssigned) {
      state = 'current';
      currentAssigned = true;
    } else {
      state = 'upcoming';
    }

    return {
      key: name,
      label: CHECKPOINT_NAME_LABELS[name],
      state,
      timestamp: formatCheckpointTimestamp(latestTimestampByName.get(name)),
    };
  });
}
