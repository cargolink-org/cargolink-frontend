import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DocumentStatus } from '../state/vehicleStore';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; bg: string; fg: string }> = {
  not_uploaded: { label: 'Not uploaded', bg: '#EDEFF2', fg: '#5B6270' },
  pending: { label: 'Pending', bg: '#FFF3CD', fg: '#8A6D00' },
  uploaded: { label: 'Uploaded', bg: '#DCEBFF', fg: '#0B5FCC' },
  verified: { label: 'Verified', bg: '#DFF6E4', fg: '#1B7A34' },
  rejected: { label: 'Rejected', bg: '#FBE0E0', fg: '#B3261E' },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_uploaded;

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Document status: ${config.label}`}
      testID={`document-status-badge-${status}`}
    >
      <Text style={[styles.label, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DocumentStatusBadge;
