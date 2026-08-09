import React, { useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from './src/state/authStore';
// import { RootSwitch } from './src/navigation/RootSwitch';
// import SplashScreen from './src/components/SplashScreen';

/**
 * ASSUMPTION FLAG: illustrative — port the hydrate-before-first-paint gate
 * below into your actual App.tsx bootstrap (splash handling, fonts,
 * providers, etc. from A.1 all still need to happen around this).
 *
 * Per A.1's "fast, synchronous-feeling splash-to-route" requirement:
 * hydrate() runs once, as early as possible, and nothing routed mounts
 * until it resolves — so the cold-launch decision (auth stack vs app
 * stack) is made before the user ever sees a screen.
 */
export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return null; // return <SplashScreen />; — keep native splash up, mount nothing routed yet
  }

  return null;
  // return (
  //   <NavigationContainer>
  //     <RootSwitch />
  //   </NavigationContainer>
  // );
}
