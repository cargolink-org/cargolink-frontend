import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthPlaceholderScreen } from '../screens/auth/AuthPlaceholderScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthPlaceholder" component={AuthPlaceholderScreen} />
    </Stack.Navigator>
  );
}

export default AuthStack;
