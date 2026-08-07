import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function TransporterHomeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Transporter Home — Placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    color: '#1A1D21',
  },
});

export default TransporterHomeScreen;
