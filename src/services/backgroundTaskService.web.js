// Background tasks are not supported on web in the same way.
// We export no-op functions to prevent import errors.

export const defineRateCheckTask = () => {
    console.log("Background tasks not supported on web");
};

export const registerBackgroundFetch = async () => {
    console.log("Background fetch registration skipped on web");
};

export const unregisterBackgroundFetch = async () => {
    console.log("Background fetch unregistration skipped on web");
};
