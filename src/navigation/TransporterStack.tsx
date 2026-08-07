import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { TransporterHomeScreen } from '../screens/transporter/TransporterHomeScreen';
import type { TransporterStackParamList } from './types';

const Tab = createBottomTabNavigator<TransporterStackParamList>();

/**
 * Owns its own tab navigator, fully independent of ShipperStack. Later
 * clusters add more transporter-specific tabs here (loads, compliance
 * documents, live tracking) — do not fold shipper screens or role
 * conditionals into this stack instead.
 */
export function TransporterStack(): React.JSX.Element {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="TransporterHome"
        component={TransporterHomeScreen}
        options={{ title: 'Home' }}
      />
    </Tab.Navigator>
  );
}

export default TransporterStack;
