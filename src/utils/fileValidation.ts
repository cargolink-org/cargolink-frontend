/**
 * Centralized file validation for document uploads.
 *
 * Mirrors the backend's validation rule (PDF or image only) so the client
 * can fail fast with a clear message instead of waiting on a server
 * rejection. This module is intentionally generic — it backs the
 * vehicle/compliance document upload flow (task C.2) and is designed to be
 * reused as-is by Cluster F's per-shipment document uploads.
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// 10 MB — adjust here if the backend's limit differs once the contract is
// frozen; keep this the single source of truth so screens never hardcode
// their own size limit.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface PickedFile {
  uri: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function isAllowedMimeType(mimeType?: string | null): mimeType is AllowedMimeType {
  if (!mimeType) return false;
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

export function validateFile(file: PickedFile): FileValidationResult {
  if (!file || !file.uri) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!isAllowedMimeType(file.mimeType)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF or an image (JPG, PNG, HEIC).',
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'This file appears to be empty.' };
  }

  if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File is too large. Maximum size is ${maxMb} MB.`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
