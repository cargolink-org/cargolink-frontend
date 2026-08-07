import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootSwitch } from './src/navigation/RootSwitch';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <RootSwitch />
    </SafeAreaProvider>
  );
}
