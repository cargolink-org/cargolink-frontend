// src/screens/shared/DocumentChecklistScreen.tsx
//
// Task F.1 — per-shipment document checklist (source doc Module 4.5a).
// Reachable from both ShipperStack and TransporterStack (lives under
// screens/shared/); rendering is identical for both roles per the source
// doc ("shipper and transporter both see the same checklist state").
//
// KNOWN INTEGRATION GAP (documented rather than silently worked around,
// matching the precedent already set in transporter/TrackingScreen.tsx for
// its own missing-data gap): this screen has no reliable source for the
// accepted load's `cargoType` — `loadStore.draft.cargoType` is cleared on
// accept (see loadStore's `setAcceptedMatch`), and `AcceptedMatch` itself
// only carries `match_id`/`status`. The applicable-document-set logic
// (`getRequiredShipmentDocumentTypes`, task F.1's data-driven mapping
// requirement) therefore only really applies mock-side today, keyed off
// the loadId itself — see `api/documents.ts`'s `mockShipmentDocumentFixture`.
// This screen simply renders whatever `getShipmentDocuments(loadId)`
// returns, which is the correct real-system behavior regardless (see that
// function's doc comment) — nothing here needs to change once a real
// cargoType-aware backend response lands.

import React from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { RouteProp } from '@react-navigation/native';

import { SHIPMENT_DOCUMENT_TYPE_LABELS, type ShipmentDocumentType } from '../../state/types';
import { getShipmentDocuments, uploadShipmentDocument } from '../../api/documents';
import { validateFile, type PickedFile } from '../../utils/fileValidation';
import {
  useLoadStore,
  useShipmentDocuments,
  useShipmentDocumentsLoading,
  useShipmentDocumentsError,
} from '../../state/loadStore';
import { DocumentStatusBadge } from '../../components/DocumentStatusBadge';
import { getErrorMessage } from '../../utils/errorMessages';

// Shared screens (registered on both ShipperStack and TransporterStack)
// are typed against a minimal, local param list rather than
// `NativeStackScreenProps<ShipperStackParamList | TransporterStackParamList, ...>`
// — a union of two structurally-different navigator param lists doesn't
// distribute cleanly through NativeStackScreenProps (the `navigation`
// prop's `navigate()` overloads differ per stack), and this screen only
// ever reads `route.params`, never `navigation`. Both stacks declare
// `DocumentChecklist: { loadId: string }` identically (navigation/types.ts),
// so this local type is structurally satisfied either way it's mounted.
type DocumentChecklistParamList = { DocumentChecklist: { loadId: string } };
interface Props {
  route: RouteProp<DocumentChecklistParamList, 'DocumentChecklist'>;
}

export default function DocumentChecklistScreen({ route }: Props) {
  const { loadId } = route.params;

  const documents = useShipmentDocuments(loadId);
  const isLoading = useShipmentDocumentsLoading(loadId);
  const fetchError = useShipmentDocumentsError(loadId);
  const setDocuments = useLoadStore((s) => s.setDocuments);
  const setDocumentsLoading = useLoadStore((s) => s.setDocumentsLoading);
  const setDocumentsError = useLoadStore((s) => s.setDocumentsError);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [uploadingType, setUploadingType] = React.useState<ShipmentDocumentType | null>(null);
  const [rowErrors, setRowErrors] = React.useState<Partial<Record<ShipmentDocumentType, string>>>(
    {}
  );

  const fetchDocuments = React.useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setDocumentsLoading(loadId, true);
      }
      try {
        const results = await getShipmentDocuments(loadId);
        setDocuments(loadId, results);
      } catch (err) {
        setDocumentsError(loadId, getErrorMessage(err));
      } finally {
        setIsRefreshing(false);
      }
    },
    [loadId, setDocuments, setDocumentsError, setDocumentsLoading]
  );

  React.useEffect(() => {
    if (documents === undefined) {
      void fetchDocuments();
    }
    // Only re-fetch when the loadId (or cache presence) changes — pull-to-
    // refresh below handles picking up status changes after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, documents === undefined]);

  const handleRefresh = () => {
    void fetchDocuments({ isRefresh: true });
  };

  const handleChooseFile = async (docType: ShipmentDocumentType) => {
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
    const file: PickedFile = {
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
    };

    // Reuses C.2's fileValidation.ts unmodified — no parallel validation
    // logic here.
    const validation = validateFile(file);
    if (!validation.valid) {
      setRowErrors((prev) => ({ ...prev, [docType]: validation.error }));
      return;
    }

    setUploadingType(docType);
    try {
      const uploaded = await uploadShipmentDocument(loadId, docType, file);
      const next = (documents ?? []).filter((d) => d.docType !== docType);
      setDocuments(loadId, [...next, uploaded]);
    } catch (err) {
      // Failed-upload (network/server error, caught here) is kept
      // distinct from rejected-on-review (a 'rejected' status on an
      // otherwise-successful upload, surfaced via the badge + reason
      // text below) — same distinction C.2 established.
      setRowErrors((prev) => ({ ...prev, [docType]: getErrorMessage(err) }));
    } finally {
      setUploadingType(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered} testID="document-checklist-loading">
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonRow} />
        ))}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered} testID="document-checklist-error">
        <Text style={styles.errorTitle}>Couldn&apos;t load documents</Text>
        <Text style={styles.errorMessage}>{fetchError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void fetchDocuments()}
          accessibilityRole="button"
          testID="document-checklist-retry-button"
        >
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const rows = documents ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="document-checklist-list"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Shipment documents</Text>
      <Text style={styles.subtitle}>
        Documents required for this shipment. Both you and the other party see the same checklist
        status.
      </Text>

      {rows.length === 0 ? (
        <View style={styles.emptyState} testID="document-checklist-empty">
          <Text style={styles.emptyText}>No documents are required for this shipment yet.</Text>
        </View>
      ) : (
        rows.map((doc) => {
          const isUploading = uploadingType === doc.docType;
          const isBusy = isUploading || doc.status === 'pending';
          const isTerminal = doc.status === 'verified' || doc.status === 'cleared';

          return (
            <View key={doc.docType} style={styles.row} testID={`checklist-row-${doc.docType}`}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowLabel}>{SHIPMENT_DOCUMENT_TYPE_LABELS[doc.docType]}</Text>
                <DocumentStatusBadge status={doc.status} />
              </View>

              {doc.status === 'rejected' && doc.rejectionReason && (
                <Text style={styles.rejectionReason}>{doc.rejectionReason}</Text>
              )}

              {rowErrors[doc.docType] && (
                <Text style={styles.error}>{rowErrors[doc.docType]}</Text>
              )}

              {!isTerminal && (
                <Pressable
                  style={[styles.actionButton, isBusy && styles.actionButtonDisabled]}
                  onPress={() => void handleChooseFile(doc.docType)}
                  disabled={isBusy}
                  testID={`upload-button-${doc.docType}`}
                  accessibilityRole="button"
                >
                  {isUploading ? (
                    <ActivityIndicator color="#0B5FCC" />
                  ) : (
                    <Text style={styles.actionButtonLabel}>
                      {doc.status === 'not_uploaded' ? 'Upload document' : 'Replace document'}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  skeletonRow: {
    width: '100%',
    height: 76,
    borderRadius: 10,
    backgroundColor: '#EDEFF2',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#1A1D21' },
  subtitle: { fontSize: 14, color: '#5B6270', marginBottom: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#5B6270', textAlign: 'center' },
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
    marginBottom: 8,
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#1A1D21', flexShrink: 1, marginRight: 8 },
  rejectionReason: { color: '#B3261E', fontSize: 12, marginBottom: 8 },
  error: { color: '#B3261E', fontSize: 12, marginBottom: 8 },
  actionButton: {
    borderWidth: 1,
    borderColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonLabel: { color: '#0B5FCC', fontSize: 14, fontWeight: '600' },
  errorTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#1A1D21' },
  errorMessage: { fontSize: 14, color: '#5B6270', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#0B5FCC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 160,
  },
  retryButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
