import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootSwitch } from './src/navigation/RootSwitch';
import { useAuthStore } from './src/state/authStore';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return null;
  }

  return (
    <NavigationContainer>
      <RootSwitch />
    </NavigationContainer>
  );
}
