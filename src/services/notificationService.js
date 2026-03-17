import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should handle while the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
};

// Note: We are no longer using static daily alerts because 
// backgroundTaskService handles 1 PM and 5 PM alerts with REAL data.
export const scheduleDailyRateAlerts = async () => {
    // This is now a no-op to avoid double notifications
    console.log("Static alerts disabled in favor of Smart Background alerts");
};

export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};
