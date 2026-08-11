import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DocumentType,
} from '../../validation/documentUploadSchema';
import { validateFile, type PickedFile } from '../../utils/fileValidation';
import { uploadDocument } from '../../api/documents';
import { useVehicleStore } from '../../state/vehicleStore';
// ASSUMPTION: same profileStore shape assumption as VehicleRegistrationScreen.
import { useProfileStore } from '../../state/profileStore';
import { DocumentStatusBadge } from '../../components/DocumentStatusBadge';
import type { TransporterStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TransporterStackParamList, 'DocumentUpload'>;

export default function DocumentUploadScreen({ navigation: _navigation }: Props) {
  const profile = useProfileStore((s) => s.profile);
  const documents = useVehicleStore((s) => s.documents);
  const updateDocumentStatus = useVehicleStore((s) => s.updateDocumentStatus);
  const [uploadingType, setUploadingType] = React.useState<DocumentType | null>(null);
  const [rowErrors, setRowErrors] = React.useState<Partial<Record<DocumentType, string>>>({});

  const processPickedFile = React.useCallback(
    async (docType: DocumentType, file: PickedFile) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setRowErrors((prev) => ({ ...prev, [docType]: validation.error }));
        return;
      }

      if (!profile?.id) {
        setRowErrors((prev) => ({
          ...prev,
          [docType]: 'Your profile could not be found. Please complete your profile first.',
        }));
        return;
      }

      setUploadingType(docType);
      updateDocumentStatus(docType, { status: 'pending' });
      try {
        const uploaded = await uploadDocument(profile.id, docType, file);
        updateDocumentStatus(docType, {
          status: uploaded.status ?? 'uploaded',
          fileUrl: uploaded.fileUrl,
          rejectionReason: null,
        });
      } catch (err) {
        updateDocumentStatus(docType, { status: 'not_uploaded' });
        setRowErrors((prev) => ({
          ...prev,
          [docType]: 'Upload failed. Please check your connection and try again.',
        }));
      } finally {
        setUploadingType(null);
      }
    },
    [profile?.id, updateDocumentStatus]
  );

  const handleChooseFile = async (docType: DocumentType) => {
    setRowErrors((prev) => ({ ...prev, [docType]: undefined }));

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    await processPickedFile(docType, {
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
    });
  };

  const handleTakePhoto = async (docType: DocumentType) => {
    setRowErrors((prev) => ({ ...prev, [docType]: undefined }));

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setRowErrors((prev) => ({
        ...prev,
        [docType]: 'Camera permission is required to take a photo.',
      }));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    await processPickedFile(docType, {
      uri: asset.uri,
      name: asset.fileName ?? `${docType}-${Date.now()}.jpg`,
      size: asset.fileSize,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const allVerified = documents.length > 0 && documents.every((d) => d.status === 'verified');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload your documents</Text>
      <Text style={styles.subtitle}>
        Upload each document below. Once our team verifies them, you'll be able to bid on and
        accept loads.
      </Text>

      {allVerified && (
        <View style={styles.successBanner} accessibilityRole="alert">
          <Text style={styles.successBannerText}>
            All documents verified — you can now bid on and accept loads.
          </Text>
        </View>
      )}

      {DOCUMENT_TYPES.map((docType) => {
        const doc = documents.find((d) => d.docType === docType);
        const status = doc?.status ?? 'not_uploaded';
        const isUploading = uploadingType === docType;
        const isBusy = isUploading || status === 'pending';

        return (
          <View key={docType} style={styles.row} testID={`document-row-${docType}`}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel}>{DOCUMENT_TYPE_LABELS[docType]}</Text>
              <DocumentStatusBadge status={status} />
            </View>

            {status === 'rejected' && doc?.rejectionReason && (
              <Text style={styles.rejectionReason}>{doc.rejectionReason}</Text>
            )}

            {rowErrors[docType] && <Text style={styles.error}>{rowErrors[docType]}</Text>}

            <View style={styles.rowActions}>
              <Pressable
                style={[styles.actionButton, isBusy && styles.actionButtonDisabled]}
                onPress={() => handleChooseFile(docType)}
                disabled={isBusy}
                testID={`upload-button-${docType}`}
                accessibilityRole="button"
              >
                {isUploading ? (
                  <ActivityIndicator color="#0B5FCC" />
                ) : (
                  <Text style={styles.actionButtonLabel}>
                    {status === 'not_uploaded' ? 'Choose file' : 'Replace'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButtonSecondary, isBusy && styles.actionButtonDisabled]}
                onPress={() => handleTakePhoto(docType)}
                disabled={isBusy}
                testID={`camera-button-${docType}`}
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonSecondaryLabel}>Take photo</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>
        You can leave this screen — we'll notify you once your documents are verified.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 20 },
  successBanner: {
    backgroundColor: '#DFF6E4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: { color: '#1B7A34', fontSize: 13, fontWeight: '600' },
  row: {
    borderWidth: 1,
    borderColor: '#EDEFF2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rejectionReason: { color: '#B3261E', fontSize: 12, marginBottom: 8 },
  error: { color: '#B3261E', fontSize: 12, marginBottom: 8 },
  rowActions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#F4F6F9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonLabel: { color: '#0B5FCC', fontSize: 14, fontWeight: '600' },
  actionButtonSecondaryLabel: { color: '#3A4048', fontSize: 14, fontWeight: '600' },
  footnote: { fontSize: 12, color: '#5B6270', textAlign: 'center', marginTop: 8 },
});
