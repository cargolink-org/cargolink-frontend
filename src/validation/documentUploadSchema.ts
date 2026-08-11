import { z } from 'zod';
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from '../utils/fileValidation';

/**
 * Vehicle/compliance document types (task C.2). Distinct from Cluster F's
 * per-shipment `shipment_documents` — do not merge these two concerns.
 */
export const DOCUMENT_TYPES = ['driving_license', 'rc', 'permit', 'insurance'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  driving_license: 'Driving License',
  rc: 'Registration Certificate (RC)',
  permit: 'Permit',
  insurance: 'Insurance',
};

export const documentFileSchema = z.object({
  uri: z.string().min(1, 'No file selected.'),
  name: z.string().min(1, 'File name is missing.'),
  size: z
    .number()
    .positive('This file appears to be empty.')
    .max(
      MAX_FILE_SIZE_BYTES,
      `File exceeds the ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB limit.`
    )
    .optional(),
  mimeType: z.string().refine((value) => isAllowedMimeType(value), {
    message: 'File must be a PDF or an image (JPG, PNG, HEIC).',
  }),
});

export const documentUploadSchema = z.object({
  docType: z.enum(DOCUMENT_TYPES),
  file: documentFileSchema,
});

export type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;
