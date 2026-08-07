import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ShipperHomeScreen } from '../screens/shipper/ShipperHomeScreen';
import type { ShipperStackParamList } from './types';

const Tab = createBottomTabNavigator<ShipperStackParamList>();

/**
 * Owns its own tab navigator, fully independent of TransporterStack. Later
 * clusters add more shipper-specific tabs here (post cargo, tracking,
 * documents) — do not fold transporter screens or role conditionals into
 * this stack instead.
 */
export function ShipperStack(): React.JSX.Element {
  return (
    <Tab.Navigator>
      <Tab.Screen name="ShipperHome" component={ShipperHomeScreen} options={{ title: 'Home' }} />
    </Tab.Navigator>
  );
}

export default ShipperStack;
