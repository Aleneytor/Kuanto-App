import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Platform, Text, SafeAreaView, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ConverterScreen from './src/screens/ConverterScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SourcesScreen from './src/screens/SourcesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LegalScreen from './src/screens/LegalScreen';

// Theme
import { COLORS } from './src/theme/colors';

// ... existing imports ...

// Context
import { RateProvider } from './src/context/RateContext';
import { ToastProvider } from './src/context/ToastContext';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

// ... existing code ...
function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#1c1c1e' }
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Sources" component={SourcesScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#34c759',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700', textTransform: 'none' },
        tabBarIndicatorStyle: { backgroundColor: '#34c759', height: 3, borderRadius: 2 },
        tabBarStyle: {
          backgroundColor: '#2c2c2e',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.05)',
        },
        tabBarPressColor: 'rgba(52, 199, 89, 0.1)',
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Calculadora" component={ConverterScreen} />
      <Tab.Screen name="Ajustes" component={SettingsStack} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1c1e', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 }}>
      <StatusBar style="light" backgroundColor="#1c1c1e" />
      <ToastProvider>
        <RateProvider>
          <NavigationContainer
            theme={{
              ...DarkTheme,
              colors: {
                ...DarkTheme.colors,
                background: '#1c1c1e',
                card: '#2c2c2e',
              }
            }}
          >
            <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1c1c1e' } }}>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="HistoryChart" component={HistoryScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="Legal" component={LegalScreen} options={{ animation: 'slide_from_bottom' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </RateProvider>
      </ToastProvider>
    </SafeAreaView>
  );
}
