// src/validation/checkpointUpdateSchema.ts
//
// Task F.1 — validates the transporter-only "Update Status" action on
// CheckpointTimelineScreen. There is no free-text field anywhere in this
// flow (the UI itself never renders a text input for this action — see
// the screen), so this schema exists as defense-in-depth, mirroring the
// project-wide pattern of validating client-side even when the UI control
// already constrains input to an enum (e.g. loadSchema's cargoType).

import { z } from 'zod';
import { CHECKPOINT_NAMES, CHECKPOINT_STATUSES } from '../state/types';
import type { CheckpointName, CheckpointStatus } from '../state/types';

export { CHECKPOINT_NAMES, CHECKPOINT_STATUSES };
export type { CheckpointName, CheckpointStatus };

export const checkpointUpdateSchema = z.object({
  checkpoint_name: z.enum(CHECKPOINT_NAMES, {
    errorMap: () => ({ message: 'Select a valid checkpoint.' }),
  }),
  status: z.enum(CHECKPOINT_STATUSES, {
    errorMap: () => ({ message: 'Select a valid status.' }),
  }),
});

export type CheckpointUpdateFormValues = z.infer<typeof checkpointUpdateSchema>;
