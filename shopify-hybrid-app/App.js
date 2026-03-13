import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import HomeScreen from './src/screens/HomeScreen';
import InboxScreen from './src/screens/InboxScreen';

// ─── White-label config ───────────────────────────────────────────────────────
// BUG-9 FIX (partial): Active tab colour sourced from app.json → expo.extra.primaryColor
const extra = Constants.expoConfig?.extra ?? {};
const TAB_ACTIVE_COLOR = extra.primaryColor ?? '#1A1A2E';

// ─── Global notification handler ─────────────────────────────────────────────
// BUG-12 FIX: setNotificationHandler is called HERE at the app root so that
// foreground notifications are presented regardless of which tab the user is on.
// It must NOT be called inside a screen module.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Inbox') {
              iconName = focused ? 'mail' : 'mail-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: TAB_ACTIVE_COLOR,
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Inbox" component={InboxScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
