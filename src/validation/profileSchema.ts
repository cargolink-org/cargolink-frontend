import { z } from 'zod';

/**
 * Standard 15-character GSTIN pattern (India):
 *   2 digits  - state code
 *   5 letters + 4 digits + 1 letter - PAN
 *   1 digit/letter - entity number
 *   'Z' - fixed by default
 *   1 digit/letter - checksum
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const SHIPPER_TYPES = ['individual', 'business'] as const;
export type ShipperType = (typeof SHIPPER_TYPES)[number];

/**
 * GSTIN is optional/conditional: required (and validated) when
 * shipperType === 'business'. For 'individual' it's optional, but if the
 * user does enter something it must still be a well-formed GSTIN.
 */
export const shipperProfileSchema = z
  .object({
    shipperType: z.enum(SHIPPER_TYPES),
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(120, 'Name is too long'),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const gstin = data.gstin?.trim() ?? '';

    if (data.shipperType === 'business') {
      if (!gstin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gstin'],
          message: 'GSTIN is required for business shippers',
        });
        return;
      }
    }

    if (gstin && !GSTIN_REGEX.test(gstin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstin'],
        message: 'Enter a valid 15-character GSTIN',
      });
    }
  });

export type ShipperProfileFormValues = z.infer<typeof shipperProfileSchema>;

/**
 * rating_avg is server-populated and read-only — it is deliberately not
 * part of the editable form schema, only displayed (see ProfileForm).
 */
export const transporterProfileSchema = z.object({
  licenseNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(5, 'License number looks too short')
    .max(30, 'License number looks too long')
    .regex(/^[A-Z0-9-]+$/, 'License number can only contain letters, numbers, and hyphens'),
});

export type TransporterProfileFormValues = z.infer<typeof transporterProfileSchema>;

export const profileSchemaByRole = {
  shipper: shipperProfileSchema,
  transporter: transporterProfileSchema,
} as const;
