import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ProfileForm } from '../../components/ProfileForm';
import { updateProfile } from '../../api/profile';
import { isShipperProfile, useProfileStore } from '../../state/profileStore';
import { useAuthStore } from '../../state/authStore';
import type { ShipperProfileFormValues } from '../../validation/profileSchema';
import type { ShipperStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<ShipperStackParamList, 'ProfileScreen'>;
type Route = RouteProp<ShipperStackParamList, 'ProfileScreen'>;

export function ShipperProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  const isNewUser = useAuthStore((state) => state.isNewUser);
  const setIsNewUser = useAuthStore((state) => state.setIsNewUser);

  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const isLoadingProfile = useProfileStore((state) => state.isLoadingProfile);
  const setLoadingProfile = useProfileStore((state) => state.setLoadingProfile);
  const profileError = useProfileStore((state) => state.profileError);
  const setProfileError = useProfileStore((state) => state.setProfileError);

  // Mandatory first-time flow (routed here from OtpEntryScreen) vs. a later
  // "edit profile" visit. Params win when explicitly provided; otherwise we
  // fall back to authStore.isNewUser.
  const mode = route.params?.mode ?? (isNewUser ? 'create' : 'edit');

  const defaultValues = isShipperProfile(profile)
    ? { shipperType: profile.shipperType, name: profile.name, gstin: profile.gstin ?? '' }
    : undefined;

  const handleSubmit = useCallback(
    async (values: ShipperProfileFormValues) => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const saved = await updateProfile({ role: 'shipper', ...values });
        setProfile(saved);

        if (mode === 'create' && isNewUser) {
          // Clears the mandatory-onboarding gate; RootSwitch re-evaluates
          // and routes into the normal shipper stack on its own.
          setIsNewUser(false);
        } else {
          navigation.goBack();
        }
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Could not save your profile. Please try again.');
      } finally {
        setLoadingProfile(false);
      }
    },
    [isNewUser, mode, navigation, setIsNewUser, setLoadingProfile, setProfile, setProfileError]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{mode === 'create' ? 'Set up your shipper profile' : 'Edit shipper profile'}</Text>
        <Text style={styles.subtitle}>We use this for invoicing and to verify your business on CargoLink.</Text>
        <ProfileForm
          role="shipper"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isLoadingProfile}
          submitError={profileError}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 6 },
});
