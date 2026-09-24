import { getRequiredShipmentDocumentTypes } from './shipmentDocuments';
import { SHIPMENT_DOCUMENT_TYPES } from '../state/types';

describe('getRequiredShipmentDocumentTypes', () => {
  it('returns the base three documents for general cargo', () => {
    expect(getRequiredShipmentDocumentTypes('general')).toEqual([
      'commercial_invoice',
      'packing_list',
      'bill_of_lading',
    ]);
  });

  it('returns the base three documents for fragile cargo', () => {
    expect(getRequiredShipmentDocumentTypes('fragile')).toEqual([
      'commercial_invoice',
      'packing_list',
      'bill_of_lading',
    ]);
  });

  it('returns the full five-document set for hazardous cargo', () => {
    expect(getRequiredShipmentDocumentTypes('hazardous')).toEqual(
      expect.arrayContaining([...SHIPMENT_DOCUMENT_TYPES]),
    );
    expect(getRequiredShipmentDocumentTypes('hazardous')).toHaveLength(5);
  });

  it('returns the full five-document set for refrigerated cargo', () => {
    expect(getRequiredShipmentDocumentTypes('refrigerated')).toHaveLength(5);
  });

  it('degrades to the base set rather than throwing for missing cargo type', () => {
    expect(getRequiredShipmentDocumentTypes(undefined)).toEqual([
      'commercial_invoice',
      'packing_list',
      'bill_of_lading',
    ]);
    expect(getRequiredShipmentDocumentTypes(null)).toEqual([
      'commercial_invoice',
      'packing_list',
      'bill_of_lading',
    ]);
  });

  it('never returns a document type outside the canonical set', () => {
    const allTypes = new Set(SHIPMENT_DOCUMENT_TYPES as readonly string[]);
    for (const cargoType of ['general', 'fragile', 'hazardous', 'refrigerated'] as const) {
      for (const docType of getRequiredShipmentDocumentTypes(cargoType)) {
        expect(allTypes.has(docType)).toBe(true);
      }
    }
  });
});
