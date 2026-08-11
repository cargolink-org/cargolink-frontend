import { z } from 'zod';

/**
 * Vehicle types supported at launch. Extend this list (and the matching
 * label map in VehicleRegistrationScreen) as the product spec grows — keep
 * it a single source of truth here rather than duplicating strings in the
 * UI.
 *
 * ASSUMPTION: this list is not yet confirmed against the backend contract
 * (draft, pending freeze per task C.2). Reconcile against the real enum
 * once it lands.
 */
export const VEHICLE_TYPES = [
  'mini_truck',
  'pickup',
  'lcv',
  'truck',
  'trailer',
  'container_truck',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const vehicleSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES, {
    errorMap: () => ({ message: 'Select a vehicle type.' }),
  }),
  registrationNumber: z
    .string()
    .trim()
    .min(4, 'Enter a valid registration number.')
    .max(20, 'Registration number looks too long.'),
  // z.coerce so text-input string values (RN TextInput only emits strings)
  // are coerced to numbers before the positive/max checks run.
  capacityWeightKg: z.coerce
    .number({ invalid_type_error: 'Enter the weight capacity.' })
    .positive('Weight capacity must be greater than 0.')
    .max(100000, 'That weight capacity looks too high — double-check it.'),
  capacityVolumeCbm: z.coerce
    .number({ invalid_type_error: 'Enter the volume capacity.' })
    .positive('Volume capacity must be greater than 0.')
    .max(1000, 'That volume capacity looks too high — double-check it.'),
  // Free-text route/corridor description. The backend contract doesn't yet
  // specify a structured shape (e.g. origin/destination pair) for this
  // field — revisit once Module 4.1's contract is frozen.
  operatingCorridor: z
    .string()
    .trim()
    .min(3, 'Describe the route or corridor you operate on.')
    .max(200, 'Keep the route description under 200 characters.'),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
