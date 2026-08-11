import { apiClient } from './client';
import type { DocumentType } from '../validation/documentUploadSchema';
import type { PickedFile } from '../utils/fileValidation';
import type { DocumentStatus } from '../state/vehicleStore';

// See src/api/vehicles.ts for the same ASSUMPTION note on `apiClient` and
// `MOCK_MODE` — kept consistent across both files until confirmed.
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

/**
 * The backend contract for this endpoint is still a draft (task C.2) and
 * may land as either:
 *   - 'multipart':   POST /documents/{ownerId}/upload  (multipart/form-data)
 *   - 'signed-url':  backend issues a short-lived signed URL, client PUTs
 *                    the file directly to storage through that URL.
 *
 * This constant is the ONLY thing that needs to flip once the contract is
 * frozen. Per the technical spec's security checklist, the client must
 * NEVER construct or hardcode a storage URL itself — only the signed URL
 * returned by the backend is ever used.
 */
const UPLOAD_STRATEGY: 'multipart' | 'signed-url' = 'multipart';

export interface UploadedDocument {
  id: string;
  ownerId: string;
  docType: DocumentType;
  status: DocumentStatus;
  fileUrl: string | null;
}

function mockUploadDocument(
  ownerId: string,
  docType: DocumentType,
  file: PickedFile
): Promise<UploadedDocument> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `mock-doc-${docType}-${Date.now()}`,
        ownerId,
        docType,
        status: 'pending',
        fileUrl: file.uri,
      });
    }, 800);
  });
}

async function uploadViaMultipart(
  ownerId: string,
  docType: DocumentType,
  file: PickedFile
): Promise<UploadedDocument> {
  const formData = new FormData();
  // React Native's FormData accepts this { uri, name, type } shape for
  // file parts — it is not a real Blob, hence the cast.
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);
  formData.append('docType', docType);

  const { data } = await apiClient.post<UploadedDocument>(
    `/documents/${ownerId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

async function uploadViaSignedUrl(
  ownerId: string,
  docType: DocumentType,
  file: PickedFile
): Promise<UploadedDocument> {
  // Step 1: ask the backend for a signed URL — never construct one client-side.
  const { data: signed } = await apiClient.post<{ uploadUrl: string; documentId: string }>(
    `/documents/${ownerId}/signed-url`,
    { docType, fileName: file.name, mimeType: file.mimeType }
  );

  // Step 2: PUT the file bytes directly to storage through the signed URL.
  const fileResponse = await fetch(file.uri);
  const blob = await fileResponse.blob();
  await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.mimeType ?? 'application/octet-stream' },
    body: blob,
  });

  // Step 3: confirm the upload so the backend can queue it for review.
  const { data } = await apiClient.post<UploadedDocument>(
    `/documents/${ownerId}/confirm-upload`,
    { documentId: signed.documentId }
  );
  return data;
}

export async function uploadDocument(
  ownerId: string,
  docType: DocumentType,
  file: PickedFile
): Promise<UploadedDocument> {
  if (MOCK_MODE) {
    return mockUploadDocument(ownerId, docType, file);
  }

  return UPLOAD_STRATEGY === 'multipart'
    ? uploadViaMultipart(ownerId, docType, file)
    : uploadViaSignedUrl(ownerId, docType, file);
}

export async function getDocumentStatuses(ownerId: string): Promise<UploadedDocument[]> {
  if (MOCK_MODE) {
    return [];
  }

  const { data } = await apiClient.get<UploadedDocument[]>(`/documents/${ownerId}`);
  return data;
}
