import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import DocumentUploadScreen from '../../../src/screens/transporter/DocumentUploadScreen';
import { uploadDocument } from '../../../src/api/documents';
import { useVehicleStore } from '../../../src/state/vehicleStore';

/**
 * See VehicleRegistrationScreen.test.tsx for the profileStore mock-shape
 * note — same assumption applies here.
 */
jest.mock('expo-document-picker');
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn(),
}));
jest.mock('../../../src/api/documents');
jest.mock('../../../src/state/profileStore', () => ({
  useProfileStore: (selector: (state: { profile: { id: string } | null }) => unknown) =>
    selector({ profile: { id: 'owner-1' } }),
}));

const navigation = {} as any;
const route = { params: undefined, key: 'DocumentUpload', name: 'DocumentUpload' } as any;

describe('DocumentUploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVehicleStore.getState().reset();
  });

  it('uploads a picked file and shows Uploaded once the API resolves', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://license.jpg', name: 'license.jpg', size: 2048, mimeType: 'image/jpeg' }],
    });
    (uploadDocument as jest.Mock).mockResolvedValue({
      id: 'doc-1',
      ownerId: 'owner-1',
      docType: 'driving_license',
      status: 'uploaded',
      fileUrl: 'file://license.jpg',
    });

    render(<DocumentUploadScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('upload-button-driving_license'));

    await waitFor(() => {
      expect(uploadDocument).toHaveBeenCalledWith(
        'owner-1',
        'driving_license',
        expect.objectContaining({ uri: 'file://license.jpg' })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('document-status-badge-uploaded')).toBeTruthy();
    });
  });

  it('shows a row error and never calls the API for an unsupported file type', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file://malware.exe', name: 'malware.exe', size: 2048, mimeType: 'application/x-msdownload' },
      ],
    });

    render(<DocumentUploadScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByTestId('upload-button-rc'));

    await waitFor(() => {
      expect(screen.getByText(/pdf or an image/i)).toBeTruthy();
    });
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('does nothing when the user cancels the file picker', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });

    render(<DocumentUploadScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByTestId('upload-button-permit'));

    await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled());
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('reverts to not_uploaded and shows a row error when the upload fails', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://insurance.pdf', name: 'insurance.pdf', size: 2048, mimeType: 'application/pdf' }],
    });
    (uploadDocument as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<DocumentUploadScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByTestId('upload-button-insurance'));

    const insuranceRow = screen.getByTestId('document-row-insurance');
    await waitFor(() => {
      expect(within(insuranceRow).getByText(/upload failed/i)).toBeTruthy();
      expect(within(insuranceRow).getByTestId('document-status-badge-not_uploaded')).toBeTruthy();
    });
  });
});
