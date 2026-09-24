import { create } from 'zustand';
import type { VehicleType } from '../validation/vehicleSchema';
import type { DocumentType } from '../validation/documentUploadSchema';

/**
 * ASSUMPTION: this repo uses Zustand for client state (inferred from the
 * `profileStore` naming convention referenced in task C.2's dependencies).
 * If the real store is built differently, port the shape below rather than
 * the implementation.
 */

/**
 * Extended in task F.1 to add `'cleared'`: the source doc's per-shipment
 * document progression (Module 4.5a) is Pending -> Uploaded -> Verified ->
 * Cleared, one terminal state beyond what C.2's vehicle-document flow
 * needed. Kept as a single shared type (not forked into a second,
 * shipment-only enum) specifically so `DocumentStatusBadge` stays the one
 * reused-not-duplicated status badge across both C.2 and F.1, per F.1's
 * explicit "reuse, don't rebuild" requirement. `'cleared'` is additive and
 * doesn't change any existing vehicle-document call site, which never
 * produces it.
 */
export type DocumentStatus =
  | 'not_uploaded'
  | 'pending'
  | 'uploaded'
  | 'verified'
  | 'cleared'
  | 'rejected';

export interface VehicleDocumentState {
  docType: DocumentType;
  status: DocumentStatus;
  fileUrl?: string | null;
  rejectionReason?: string | null;
  updatedAt?: string | null;
}

export interface RegisteredVehicle {
  id: string;
  ownerId: string;
  vehicleType: VehicleType;
  registrationNumber: string;
  capacityWeightKg: number;
  capacityVolumeCbm: number;
  operatingCorridor: string;
}

interface VehicleStoreState {
  vehicle: RegisteredVehicle | null;
  documents: VehicleDocumentState[];
  isLoading: boolean;
  error: string | null;

  setVehicle: (vehicle: RegisteredVehicle) => void;
  setDocuments: (documents: VehicleDocumentState[]) => void;
  updateDocumentStatus: (docType: DocumentType, patch: Partial<VehicleDocumentState>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialDocuments = (): VehicleDocumentState[] =>
  DOCUMENT_TYPES_FOR_INIT.map((docType) => ({ docType, status: 'not_uploaded' as const }));

// Kept local to avoid a circular import with validation/documentUploadSchema
// at module-init time; value must stay in sync with DOCUMENT_TYPES there.
const DOCUMENT_TYPES_FOR_INIT: DocumentType[] = ['driving_license', 'rc', 'permit', 'insurance'];

export const useVehicleStore = create<VehicleStoreState>((set) => ({
  vehicle: null,
  documents: initialDocuments(),
  isLoading: false,
  error: null,

  setVehicle: (vehicle) => set({ vehicle }),
  setDocuments: (documents) => set({ documents }),
  updateDocumentStatus: (docType, patch) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.docType === docType ? { ...d, ...patch } : d)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({ vehicle: null, documents: initialDocuments(), isLoading: false, error: null }),
}));

/**
 * True once every required document has reached `verified` status — the
 * client-side mirror of Module 4.1's "verified badge unlocks bidding" rule.
 * This only gates local UI (e.g. disabling a screen's continue affordance);
 * the backend remains the source of truth for whether a transporter can
 * actually bid/accept, and must re-check this server-side.
 */
export const selectCanBidOrAccept = (state: VehicleStoreState): boolean =>
  state.documents.length > 0 && state.documents.every((d) => d.status === 'verified');
