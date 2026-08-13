import { z } from 'zod';

import { CARGO_TYPES, type CargoType } from '../state/types';
import { VEHICLE_TYPES } from './vehicleSchema';

export { CARGO_TYPES };
export type { CargoType };

export const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  general: 'General',
  fragile: 'Fragile',
  hazardous: 'Hazardous',
  refrigerated: 'Refrigerated',
};

/**
 * Weight above this threshold isn't rejected — it triggers a confirmation
 * step instead (task D.1: "values above a sane max... trigger a
 * confirmation prompt rather than outright rejection, since it may be a
 * legitimate large shipment"). Kept here, next to the schema, so the
 * screen's confirmation logic and any future validation change stay in
 * sync from a single source of truth.
 */
export const HIGH_WEIGHT_CONFIRMATION_THRESHOLD_KG = 50_000;

export function requiresHighWeightConfirmation(weightKg: number | undefined): boolean {
  return typeof weightKg === 'number' && weightKg > HIGH_WEIGHT_CONFIRMATION_THRESHOLD_KG;
}

/**
 * A geocoded point as selected via `LocationPicker`. Coordinates are
 * required and structurally validated — raw free-text addresses are never
 * accepted here, matching the backend's `GEOGRAPHY(Point, 4326)` columns.
 */
const geoPointSchema = z.object({
  lat: z.number({ invalid_type_error: 'Select a location from the search results.' }).min(-90).max(90),
  lng: z.number({ invalid_type_error: 'Select a location from the search results.' }).min(-180).max(180),
  label: z.string().trim().min(1),
});

// Rounded to ~11cm precision before comparison so two picks of "the same"
// point (e.g. re-selecting the same search result) aren't treated as
// different due to floating point noise, while still catching genuine
// source === destination submissions.
const roundCoord = (n: number) => Math.round(n * 1e6) / 1e6;

export const loadSchema = z
  .object({
    weightKg: z.coerce
      .number({ invalid_type_error: 'Enter the cargo weight.' })
      .positive('Weight must be greater than 0.'),
    // errorMap message matches the "required single-select" requirement;
    // z.enum already rejects '' (the Picker's untouched sentinel value).
    cargoType: z.enum(CARGO_TYPES, {
      errorMap: () => ({ message: 'Select a cargo type.' }),
    }),
    source: geoPointSchema,
    destination: geoPointSchema,
    deadline: z
      .string({ invalid_type_error: 'Select a pickup deadline.' })
      .min(1, 'Select a pickup deadline.')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Select a valid date and time.')
      .refine((value) => new Date(value).getTime() > Date.now(), 'Deadline must be in the future.'),
    preferredVehicleType: z.enum(VEHICLE_TYPES, {
      errorMap: () => ({ message: 'Select a preferred vehicle type.' }),
    }),
  })
  .superRefine((values, ctx) => {
    if (
      values.source &&
      values.destination &&
      roundCoord(values.source.lat) === roundCoord(values.destination.lat) &&
      roundCoord(values.source.lng) === roundCoord(values.destination.lng)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source and destination cannot be the same location.',
        path: ['destination'],
      });
    }
  });

export type LoadFormValues = z.infer<typeof loadSchema>;
