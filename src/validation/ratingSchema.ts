// src/validation/ratingSchema.ts
//
// Task G.1 — validates the post-trip rating form (score 1–5, optional
// comment ≤500 chars) before `POST /ratings`. The UI itself already
// constrains score entry to `StarInput`'s five discrete values and the
// comment field to `maxLength={500}`, so — same reasoning as
// `checkpointUpdateSchema.ts` — this exists as defense-in-depth rather
// than because an invalid value could otherwise reach the form's local
// state.

import { z } from 'zod';

export const ratingSchema = z.object({
  score: z
    .number({ invalid_type_error: 'Select a star rating.' })
    .int('Select a star rating.')
    .min(1, 'Select a star rating.')
    .max(5, 'Select a star rating.'),
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or fewer.')
    .optional(),
});

export type RatingFormValues = z.infer<typeof ratingSchema>;
