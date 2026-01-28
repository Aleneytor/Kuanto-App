import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllRates } from './rateService';

const BACKGROUND_FETCH_TASK = 'background-rate-check';
const CACHE_KEY = '@app_rates_cache';

// This function calculates the difference and sends the notification
const checkRatesAndNotify = async () => {
    try {
        console.log("[BackgroundFetch] Checking rates...");

        // 1. Get cached rates
        const cachedString = await AsyncStorage.getItem(CACHE_KEY);
        const cachedRates = cachedString ? JSON.parse(cachedString) : null;

        // 2. Fetch fresh rates
        const freshRates = await fetchAllRates();

        if (!cachedRates) {
            // No cache? Just save the current ones for next time
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(freshRates));
            return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        const currentHour = new Date().getHours();
        const todayKey = new Date().toISOString().split('T')[0];

        // Track sent notifications for today to avoid multiple triggers within the same window
        const lastSent_1PM = await AsyncStorage.getItem('@app_sent_1PM');
        const lastSent_5PM = await AsyncStorage.getItem('@app_sent_5PM');

        // 1. Report for USDT (1:00 PM) - Send between 1:00 PM and 1:59 PM
        if (currentHour === 13 && lastSent_1PM !== todayKey) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🪙 Kuanto: Reporte 1:00 PM`,
                    body: `El promedio USDT actual es ${parseFloat(freshRates.parallel).toFixed(2)} Bs.`,
                    data: { screen: 'Inicio' },
                },
                trigger: null,
            });
            await AsyncStorage.setItem('@app_sent_1PM', todayKey);
            return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        // 2. Report for BCV (5:00 PM) - Send between 5:00 PM and 5:59 PM
        if (currentHour === 17 && lastSent_5PM !== todayKey) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `📊 Kuanto: Reporte 5:00 PM`,
                    body: `La tasa oficial BCV cerró en ${parseFloat(freshRates.bcv).toFixed(2)} Bs.`,
                    data: { screen: 'Inicio' },
                },
                trigger: null,
            });
            await AsyncStorage.setItem('@app_sent_5PM', todayKey);
            return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
        console.error("[BackgroundFetch] Error:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
};

// Define the task
// IMPORTANT: This must be called in the global scope, but we'll export a function to ensure it's loaded.
export const defineRateCheckTask = () => {
    if (!TaskManager.isTaskDefined(BACKGROUND_FETCH_TASK)) {
        TaskManager.defineTask(BACKGROUND_FETCH_TASK, checkRatesAndNotify);
    }
};

// Register the task
export const registerBackgroundFetch = async () => {
    try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 60 * 60, // 1 hour (Android floor is 15 mins, iOS varies)
            stopOnTerminate: false,
            startOnBoot: true,
        });
        console.log("[BackgroundFetch] Task registered");
    } catch (err) {
        console.error("[BackgroundFetch] Registration failed:", err);
    }
};

// Unregister the task
export const unregisterBackgroundFetch = async () => {
    if (TaskManager.isTaskDefined(BACKGROUND_FETCH_TASK)) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    }
};
