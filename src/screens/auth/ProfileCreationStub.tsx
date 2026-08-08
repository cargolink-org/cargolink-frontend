import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * ProfileCreationStub — placeholder navigation target for new users.
 *
 * Task B.1's spec calls for routing a first-time user (per
 * `verify`'s `is_new_user` flag) to profile creation "before the main app,"
 * but Cluster C (Profile creation/edit UI) hasn't been built yet. This stub
 * exists purely so the new-user branch has somewhere real to land instead of
 * silently falling through to a role stack the user hasn't actually set up
 * for. Replace this component's usage in RootSwitch with the real
 * ShipperProfileScreen/TransporterProfileScreen once Cluster C ships.
 */
export default function ProfileCreationStub() {
  return (
    <View style={styles.container} testID="profile-creation-stub">
      <Text style={styles.title}>Welcome to CargoLink</Text>
      <Text style={styles.body}>
        Profile setup isn't built yet (Cluster C) — this is a placeholder
        landing screen for new users after their first successful sign-in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  body: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
