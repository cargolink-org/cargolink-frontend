// src/utils/shipmentDocuments.ts
//
// Task F.1 — the data-driven cargo-type -> required-shipment-document-types
// mapping. Kept as a standalone, pure, directly-unit-testable function
// (not inline conditionals inside a screen component) per this task's
// explicit architecture requirement, so `DocumentChecklistScreen` can be
// verified against multiple cargo-type fixtures without rendering.
//
// ARCHITECTURAL NOTE: this function is consumed primarily by the *mock*
// implementation of `getShipmentDocuments` in `api/documents.ts`, not by
// the screen directly. In the real system, "which documents apply to this
// load" is a compliance-adjacent business rule that belongs on the
// backend (the same load might need different documents depending on
// full context the client doesn't have — route, declared value, etc.),
// exactly the same reasoning G.2's admin dashboard guide already applies
// to aggregate stats ("resist the temptation to compute any aggregation
// client-side, since that duplicates backend logic and risks drift").
// `DocumentChecklistScreen` therefore renders exactly what
// `getShipmentDocuments(loadId)` returns — never a hardcoded universal
// list, never its own independent re-filter of the API response — and
// this function's role is to make the *mock* stand-in for that backend
// behavior data-driven and testable, standing in for the real rule until
// Dinesh's backend implements it.
//
// ASSUMPTION (flagged pending Dinesh's contract confirmation — same
// category as the "cargo-type-to-required-documents mapping" item already
// noted as an open contract item for this task): neither source document
// defines exactly which document types are required for which cargo type
// — only that some documents are required "as applicable" (Module 4.5a).
// `CargoType` (general/fragile/hazardous/refrigerated, task D.1) has no
// explicit domestic-vs-cross-border flag to hang this off of. The mapping
// below is a reasonable placeholder: three documents (commercial invoice,
// packing list, bill of lading) are treated as universal base paperwork
// for any load; the two customs-related documents are added for
// 'hazardous' and 'refrigerated' cargo, treated here as a proxy for
// "higher compliance bar" pending a real cross-border signal. The
// ARCHITECTURAL POINT (a data-driven function, not a hardcoded list) holds
// regardless of which exact cargo types land in which bucket once the
// contract is confirmed — only this function's body should need to change
// then, not any screen.

import { SHIPMENT_DOCUMENT_TYPES, type ShipmentDocumentType } from '../state/types';
import type { CargoType } from '../state/types';

const BASE_SHIPMENT_DOCUMENT_TYPES: ShipmentDocumentType[] = [
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
];

const FULL_SHIPMENT_DOCUMENT_TYPES: ShipmentDocumentType[] = [...SHIPMENT_DOCUMENT_TYPES];

/**
 * Returns the ordered list of `ShipmentDocumentType`s required for a given
 * cargo type. Never returns a document type outside `SHIPMENT_DOCUMENT_TYPES`.
 * `cargoType` is optional/nullable defensively (a load record mid-fetch, or
 * a malformed fixture, shouldn't crash the checklist — it degrades to the
 * base set rather than throwing).
 */
export function getRequiredShipmentDocumentTypes(
  cargoType: CargoType | undefined | null,
): ShipmentDocumentType[] {
  if (cargoType === 'hazardous' || cargoType === 'refrigerated') {
    return FULL_SHIPMENT_DOCUMENT_TYPES;
  }
  return BASE_SHIPMENT_DOCUMENT_TYPES;
}
