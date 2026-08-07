import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import type { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    </Stack.Navigator>
  );
}

export default AdminStack;
