import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Platform, SafeAreaView, StatusBar as RNStatusBar, LogBox, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

// Ignore the intrusive Expo Go notification warning on Android
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import * as Notifications from 'expo-notifications';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ConverterScreen from './src/screens/ConverterScreen'; // Kept in case it's needed later, though not in main nav
import SettingsScreen from './src/screens/SettingsScreen';
import SourcesScreen from './src/screens/SourcesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LegalScreen from './src/screens/LegalScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

// Context
import { RateProvider } from './src/context/RateContext';
import { ToastProvider } from './src/context/ToastContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { PaymentProvider } from './src/context/PaymentContext';
import { requestNotificationPermissions, scheduleDailyRateAlerts } from './src/services/notificationService';
import { defineRateCheckTask, registerBackgroundFetch } from './src/services/backgroundTaskService';

// Define the background task globally
defineRateCheckTask();

const Stack = createNativeStackNavigator();

function AppContent() {
  const { colors, isDark, isLoading: themeLoading } = useTheme();
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);

  React.useEffect(() => {
    // Handle notification clicks
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification tapped:", response);
    });

    // Check if we should auto-schedule on first run or if enabled
    const checkInitialSetup = async () => {
      const isIntroShown = await AsyncStorage.getItem('@app_intro_shown');
      setIsFirstLaunch(isIntroShown === null);

      const isFirstRun = await AsyncStorage.getItem('@app_first_run_done');
      const savedStatus = await AsyncStorage.getItem('@app_notifications');

      // On first run, try to enable it by default if user permits
      if (isFirstRun === null) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleDailyRateAlerts();
          await registerBackgroundFetch();
          await AsyncStorage.setItem('@app_notifications', 'true');
        }
        await AsyncStorage.setItem('@app_first_run_done', 'true');
      } else if (savedStatus === 'true') {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleDailyRateAlerts();
          await registerBackgroundFetch();
        }
      }
    };

    checkInitialSetup();

    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    // Inject Microsoft Clarity only on Web
    if (Platform.OS === 'web') {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", "v04xb7hq8o");

      // Google Analytics
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-WLSGXYDXMD";
      document.head.appendChild(gaScript);

      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-WLSGXYDXMD');

      // EffectiveGateCPM
      // EffectiveGateCPM
      // EffectiveGateCPM
      // const adScript = document.createElement('script');
      // adScript.async = true;
      // adScript.setAttribute('data-cfasync', 'false');
      // adScript.src = "https://pl28550995.effectivegatecpm.com/a0674cf56fa90f8f848548993f61c612/invoke.js";
      // document.head.appendChild(adScript);

      // Apply Poppins font globally via CSS
      const poppinsStyle = document.createElement('style');
      poppinsStyle.textContent = `
        * {
          font-family: 'Poppins_400Regular', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        [style*="font-weight: 500"], [style*="fontWeight: 500"] {
          font-family: 'Poppins_500Medium', 'Poppins', sans-serif !important;
        }
        [style*="font-weight: 600"], [style*="fontWeight: 600"] {
          font-family: 'Poppins_600SemiBold', 'Poppins', sans-serif !important;
        }
        [style*="font-weight: 700"], [style*="fontWeight: 700"],
        [style*="font-weight: 800"], [style*="fontWeight: 800"],
        [style*="font-weight: bold"], [style*="fontWeight: bold"] {
          font-family: 'Poppins_700Bold', 'Poppins', sans-serif !important;
        }
      `;
      document.head.appendChild(poppinsStyle);
    }
  }, []);

  if (isFirstLaunch === null || themeLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00D66F" />
        <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>Cargando Kuanto...</Text>
      </View>
    );
  }

  const navigationTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.card,
    }
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
    }
  };

  const linking = {
    prefixes: [
      'https://kuanto.online/app',
      'kuanto://',
      'http://localhost:19006/app'
    ],
    config: {
      screens: {
        Welcome: 'welcome',
        Home: '',
        Settings: 'settings',
        Sources: 'sources',
        HistoryChart: 'history',
        Legal: 'legal',
      },
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <NavigationContainer theme={navigationTheme} linking={linking}>
        <Stack.Navigator
          initialRouteName={isFirstLaunch ? "Welcome" : "Home"}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Kuanto' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Sources" component={SourcesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="HistoryChart" component={HistoryScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Legal" component={LegalScreen} options={{ animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00D66F" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <PaymentProvider>
          <RateProvider>
            <AppContent />
          </RateProvider>
        </PaymentProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
