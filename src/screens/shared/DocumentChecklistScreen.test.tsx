import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import DocumentChecklistScreen from '../../../src/screens/shared/DocumentChecklistScreen';
import { getShipmentDocuments, uploadShipmentDocument } from '../../../src/api/documents';
import { useLoadStore } from '../../../src/state/loadStore';

jest.mock('expo-document-picker');
jest.mock('../../../src/api/documents');

function routeFor(loadId: string) {
  return { params: { loadId }, key: 'DocumentChecklist', name: 'DocumentChecklist' } as any;
}

describe('DocumentChecklistScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLoadStore.setState({ documents: {}, documentsLoading: {}, documentsError: {} });
  });

  it('renders exactly the base three documents for a general-cargo fixture (no false-negative blocker)', async () => {
    (getShipmentDocuments as jest.Mock).mockResolvedValue([
      { docType: 'commercial_invoice', status: 'not_uploaded', fileUrl: null },
      { docType: 'packing_list', status: 'uploaded', fileUrl: 'mock://a' },
      { docType: 'bill_of_lading', status: 'verified', fileUrl: 'mock://b' },
    ]);

    render(<DocumentChecklistScreen route={routeFor('load-general')} />);

    await waitFor(() => {
      expect(screen.getByTestId('checklist-row-commercial_invoice')).toBeTruthy();
    });
    expect(screen.getByTestId('checklist-row-packing_list')).toBeTruthy();
    expect(screen.getByTestId('checklist-row-bill_of_lading')).toBeTruthy();
    // The two customs-related types must NOT appear at all for this fixture.
    expect(screen.queryByTestId('checklist-row-customs_clearance_certificate')).toBeNull();
    expect(screen.queryByTestId('checklist-row-certificate_of_origin')).toBeNull();
  });

  it('renders all five documents for a hazardous-cargo fixture', async () => {
    (getShipmentDocuments as jest.Mock).mockResolvedValue([
      { docType: 'commercial_invoice', status: 'not_uploaded', fileUrl: null },
      { docType: 'packing_list', status: 'not_uploaded', fileUrl: null },
      { docType: 'bill_of_lading', status: 'uploaded', fileUrl: 'mock://a' },
      { docType: 'customs_clearance_certificate', status: 'pending', fileUrl: 'mock://b' },
      { docType: 'certificate_of_origin', status: 'verified', fileUrl: 'mock://c' },
    ]);

    render(<DocumentChecklistScreen route={routeFor('load-hazardous')} />);

    await waitFor(() => {
      expect(screen.getByTestId('checklist-row-certificate_of_origin')).toBeTruthy();
    });
    expect(screen.getByTestId('checklist-row-customs_clearance_certificate')).toBeTruthy();
  });

  it('renders all five documents already cleared for a refrigerated-cargo fixture', async () => {
    (getShipmentDocuments as jest.Mock).mockResolvedValue(
      ['commercial_invoice', 'packing_list', 'bill_of_lading', 'customs_clearance_certificate', 'certificate_of_origin'].map(
        (docType) => ({ docType, status: 'cleared', fileUrl: `mock://${docType}` })
      )
    );

    render(<DocumentChecklistScreen route={routeFor('load-refrigerated')} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('document-status-badge-cleared')).toHaveLength(5);
    });
    // A cleared document is terminal — no upload/replace action should render.
    expect(screen.queryByTestId('upload-button-commercial_invoice')).toBeNull();
  });

  it('uploads a picked document and reflects the returned status via the reused DocumentStatusBadge', async () => {
    (getShipmentDocuments as jest.Mock).mockResolvedValue([
      { docType: 'commercial_invoice', status: 'not_uploaded', fileUrl: null },
    ]);
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://invoice.pdf', name: 'invoice.pdf', size: 1024, mimeType: 'application/pdf' }],
    });
    (uploadShipmentDocument as jest.Mock).mockResolvedValue({
      docType: 'commercial_invoice',
      status: 'pending',
      fileUrl: 'file://invoice.pdf',
    });

    render(<DocumentChecklistScreen route={routeFor('load-upload')} />);

    await waitFor(() => screen.getByTestId('upload-button-commercial_invoice'));
    fireEvent.press(screen.getByTestId('upload-button-commercial_invoice'));

    await waitFor(() => {
      expect(uploadShipmentDocument).toHaveBeenCalledWith(
        'load-upload',
        'commercial_invoice',
        expect.objectContaining({ uri: 'file://invoice.pdf' })
      );
    });

    await waitFor(() => {
      const row = screen.getByTestId('checklist-row-commercial_invoice');
      expect(within(row).getByTestId('document-status-badge-pending')).toBeTruthy();
    });
  });

  it('shows a row error and never calls the API for an unsupported file type', async () => {
    (getShipmentDocuments as jest.Mock).mockResolvedValue([
      { docType: 'commercial_invoice', status: 'not_uploaded', fileUrl: null },
    ]);
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://bad.exe', name: 'bad.exe', size: 1024, mimeType: 'application/x-msdownload' }],
    });

    render(<DocumentChecklistScreen route={routeFor('load-badfile')} />);
    await waitFor(() => screen.getByTestId('upload-button-commercial_invoice'));
    fireEvent.press(screen.getByTestId('upload-button-commercial_invoice'));

    await waitFor(() => {
      expect(screen.getByText(/pdf or an image/i)).toBeTruthy();
    });
    expect(uploadShipmentDocument).not.toHaveBeenCalled();
  });

  it('shows a retry-capable error state when the fetch fails', async () => {
    (getShipmentDocuments as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<DocumentChecklistScreen route={routeFor('load-error')} />);

    await waitFor(() => {
      expect(screen.getByTestId('document-checklist-error')).toBeTruthy();
    });
    expect(screen.getByTestId('document-checklist-retry-button')).toBeTruthy();
  });
});
