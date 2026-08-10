import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ProfileForm } from '../../components/ProfileForm';
import { updateProfile } from '../../api/profile';
import { isTransporterProfile, useProfileStore } from '../../state/profileStore';
import { useAuthStore } from '../../state/authStore';
import type { TransporterProfileFormValues } from '../../validation/profileSchema';
import type { TransporterStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<TransporterStackParamList, 'ProfileScreen'>;
type Route = RouteProp<TransporterStackParamList, 'ProfileScreen'>;

export function TransporterProfileScreen() {
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

  const mode = route.params?.mode ?? (isNewUser ? 'create' : 'edit');

  const defaultValues = isTransporterProfile(profile)
    ? { licenseNumber: profile.licenseNumber }
    : undefined;
  const ratingAvg = isTransporterProfile(profile) ? profile.ratingAvg : null;

  const handleSubmit = useCallback(
    async (values: TransporterProfileFormValues) => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const saved = await updateProfile({ role: 'transporter', ...values });
        setProfile(saved);

        if (mode === 'create' && isNewUser) {
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
        <Text style={styles.title}>
          {mode === 'create' ? 'Set up your transporter profile' : 'Edit transporter profile'}
        </Text>
        <Text style={styles.subtitle}>
          License details are required before you can bid on loads. Vehicle and document uploads come next.
        </Text>
        <ProfileForm
          role="transporter"
          defaultValues={defaultValues}
          ratingAvg={ratingAvg}
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
