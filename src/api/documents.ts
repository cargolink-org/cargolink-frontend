import { apiClient } from './client';
import type { DocumentType } from '../validation/documentUploadSchema';
import type { PickedFile } from '../utils/fileValidation';
import type { DocumentStatus } from '../state/vehicleStore';
import type { ShipmentDocument, ShipmentDocumentType, ContainerDetails } from '../state/types';
import { getRequiredShipmentDocumentTypes } from '../utils/shipmentDocuments';
import type { CargoType } from '../state/types';

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

// ---------------------------------------------------------------------
// Task F.1 — per-shipment documents (`shipment_documents` table, keyed by
// `load_id`). Deliberately separate functions/naming from the
// vehicle/compliance-document functions above (task C.2, `documents`
// table, keyed by `owner_id`) — see this task's own spec: "this task's
// screens operate on a load_id, C.2's operated on an owner_id."
//
// ASSUMPTION (flag for review at contract freeze): the technical spec's
// confirmed route for this endpoint is literally the same path shape as
// C.2's vehicle-document route — `GET /documents/{id}` — just with `id`
// meaning `loadId` here instead of `ownerId`. Kept as-is per the spec text
// rather than invented a different prefix (e.g. `/loads/{loadId}/documents`),
// since the spec explicitly writes `GET /documents/{loadId}`. Flag with
// Dinesh alongside the other pending contract items — if the two document
// concepts end up sharing one literal route, the backend will need a way
// to disambiguate an `ownerId` from a `loadId` server-side (or the routes
// will need to diverge before freeze). Isolating the two concerns in
// separate functions here means only this function needs to change if the
// route is adjusted, not any screen.
// ---------------------------------------------------------------------

function mockShipmentDocumentFixture(
  loadId: string,
  cargoTypeHint?: CargoType
): ShipmentDocument[] {
  // Sentinel loadIds map to a specific cargo type when no explicit hint is
  // passed, so DocumentChecklistScreen still gets a sensible fixture in
  // mock mode without every call site needing to thread the load's cargo
  // type through by hand. Three distinct combinations, per the task's
  // explicit test requirement (varying cargo type / applicability /
  // status mix):
  let cargoType: CargoType | undefined = cargoTypeHint;
  if (!cargoType) {
    if (loadId === 'mock-load-hazardous') cargoType = 'hazardous';
    else if (loadId === 'mock-load-refrigerated') cargoType = 'refrigerated';
    else cargoType = 'general';
  }

  const requiredTypes = getRequiredShipmentDocumentTypes(cargoType);

  // Status mix varies by fixture so tests can assert on badge rendering
  // across the full Pending -> Uploaded -> Verified -> Cleared range, not
  // just one status repeated.
  const statusCycle: DocumentStatus[] =
    cargoType === 'refrigerated'
      ? requiredTypes.map(() => 'cleared')
      : ['not_uploaded', 'uploaded', 'verified', 'pending', 'cleared'];

  return requiredTypes.map((docType, i) => ({
    docType,
    status: statusCycle[i % statusCycle.length],
    fileUrl: statusCycle[i % statusCycle.length] === 'not_uploaded' ? null : `mock://shipment-doc/${loadId}/${docType}`,
  }));
}

function mockGetShipmentDocuments(
  loadId: string,
  cargoTypeHint?: CargoType
): Promise<ShipmentDocument[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockShipmentDocumentFixture(loadId, cargoTypeHint)), 500);
  });
}

function mockUploadShipmentDocument(
  loadId: string,
  docType: ShipmentDocumentType,
  file: PickedFile
): Promise<ShipmentDocument> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ docType, status: 'pending', fileUrl: file.uri });
    }, 800);
  });
}

interface ShipmentDocumentWire {
  doc_type: ShipmentDocumentType;
  status: DocumentStatus;
  file_url: string | null;
}

function fromWireShipmentDocument(wire: ShipmentDocumentWire): ShipmentDocument {
  return { docType: wire.doc_type, status: wire.status, fileUrl: wire.file_url };
}

/**
 * Fetches the applicable shipment-document checklist for a load. The
 * returned list IS the applicable set — `DocumentChecklistScreen` renders
 * exactly what comes back here rather than independently re-filtering by
 * cargo type, so shipper and transporter always see identical checklist
 * state (source doc: "Shipper and transporter both see the same checklist
 * state") and no document type can show as a false-negative blocker due to
 * client/server logic drifting apart. `cargoTypeHint` is mock-mode-only
 * (see ASSUMPTION above `mockShipmentDocumentFixture`) — the real backend
 * infers applicability server-side from the load record itself.
 */
export async function getShipmentDocuments(
  loadId: string,
  cargoTypeHint?: CargoType
): Promise<ShipmentDocument[]> {
  if (MOCK_MODE) {
    return mockGetShipmentDocuments(loadId, cargoTypeHint);
  }

  const { data } = await apiClient.get<ShipmentDocumentWire[]>(`/documents/${loadId}`);
  return data.map(fromWireShipmentDocument);
}

export async function uploadShipmentDocument(
  loadId: string,
  docType: ShipmentDocumentType,
  file: PickedFile
): Promise<ShipmentDocument> {
  if (MOCK_MODE) {
    return mockUploadShipmentDocument(loadId, docType, file);
  }

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);
  formData.append('docType', docType);

  const { data } = await apiClient.post<ShipmentDocumentWire>(
    `/documents/${loadId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return fromWireShipmentDocument(data);
}

// ---------------------------------------------------------------------
// Task F.1 — container details (`containers` table). Sea/air cargo only;
// `null` means "no container record for this load" (a normal outcome for
// a domestic-only road shipment), not an error.
//
// ASSUMPTION (flag for review at contract freeze — this is the "container
// details endpoint path" item already noted as an open contract item for
// this task): the technical spec's "Core API Endpoints" list (§5) has NO
// endpoint at all for `containers`, even though the table exists in the
// schema (§4) and the source doc names container tracking as an explicit
// sub-feature (Module 4.5c). `GET /containers/{loadId}` below is an
// inferred, load_id-scoped route matching the sibling `documents`/
// `checkpoints` pattern — this is the least-confirmed endpoint in this
// task and should be flagged with Dinesh first among the three.
// ---------------------------------------------------------------------

function mockContainerFixture(loadId: string): ContainerDetails | null {
  if (loadId === 'mock-load-no-container') {
    return null;
  }
  return {
    containerNumber: `MSCU${loadId.slice(-6).padStart(6, '0')}`,
    vesselOrFlight: 'MV Pacific Voyager',
    portOfLoading: 'Nhava Sheva (INNSA)',
    portOfDischarge: 'Jebel Ali (AEJEA)',
  };
}

function mockGetContainerDetails(loadId: string): Promise<ContainerDetails | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockContainerFixture(loadId)), 500);
  });
}

export async function getContainerDetails(loadId: string): Promise<ContainerDetails | null> {
  if (MOCK_MODE) {
    return mockGetContainerDetails(loadId);
  }

  try {
    const { data } = await apiClient.get<ContainerDetails>(`/containers/${loadId}`);
    return data;
  } catch (err) {
    // A 404 means "no container record for this load" — not applicable,
    // not a fetch failure. Any other status/network error rethrows so the
    // screen can show its retry-capable error state.
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return null;
    }
    throw err;
  }
}
