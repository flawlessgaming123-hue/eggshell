// BUG-8 FIX: All imports must be at the top of the file, before any executable code.
// BUG-1 FIX: Firebase config is no longer hardcoded. Values are read from
//            app.json → expo.extra at runtime via expo-constants, so no secrets
//            are committed to source control.
// BUG-2 FIX: Pass { projectId } to getExpoPushTokenAsync() — required on Expo SDK 49+.

import Constants from 'expo-constants';
import { initializeApp, getApps } from 'firebase/app';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Values are injected at build time via app.json → expo.extra.firebase.
// To configure: add an "extra" block to app.json (or app.config.js), e.g.:
//
//   "extra": {
//     "firebase": {
//       "apiKey": "...",
//       "authDomain": "...",
//       "projectId": "...",
//       "storageBucket": "...",
//       "messagingSenderId": "...",
//       "appId": "..."
//     },
//     "shopifyStoreUrl": "https://your-store.myshopify.com",
//     "eas": { "projectId": "your-eas-project-id" }
//   }
//
// Never paste live credentials directly into this file.
const extra = Constants.expoConfig?.extra ?? {};
const firebaseConfig = {
    apiKey: extra.firebase?.apiKey ?? '',
    authDomain: extra.firebase?.authDomain ?? '',
    projectId: extra.firebase?.projectId ?? '',
    storageBucket: extra.firebase?.storageBucket ?? '',
    messagingSenderId: extra.firebase?.messagingSenderId ?? '',
    appId: extra.firebase?.appId ?? '',
};

// Initialise Firebase only once (guard against hot-reload double-init).
if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
        console.warn('[Notifications] Firebase config is missing. Push notifications will not work. Check app.json → expo.extra.firebase.');
    } else {
        initializeApp(firebaseConfig);
    }
}

/** AsyncStorage key used for the notification inbox */
export const INBOX_STORAGE_KEY = '@notifications';

/**
 * Requests push-notification permission and returns an Expo push token.
 * Must only run on a physical device — emulators/simulators do not support FCM.
 *
 * @returns {Promise<string|null>} Expo push token or null if unavailable.
 */
export async function registerForPushNotificationsAsync() {
    // ── Physical-device guard ──────────────────────────────────────────────────
    if (!Device.isDevice) {
        console.warn('[Notifications] Push tokens are only available on physical devices.');
        return null;
    }

    // ── Android notification channel ───────────────────────────────────────────
    // BUG-3 FIX: Channel ID is "default" — must match the channelId sent by fcm.js.
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            // BUG-9 FIX: Use brand colour from app.json extra, falling back to Shopify green.
            lightColor: extra.primaryColor ?? '#1A1A2E',
        });
    }

    // ── Permission request ─────────────────────────────────────────────────────
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted.');
        return null;
    }

    // ── Token retrieval ────────────────────────────────────────────────────────
    // BUG-2 FIX: projectId is required for Expo SDK 49+.
    try {
        const projectId = extra.eas?.projectId;
        if (!projectId) {
            console.warn('[Notifications] eas.projectId is not set in app.json → extra. Push token may fail on production builds.');
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log('[Notifications] Expo push token:', tokenData.data);
        return tokenData.data;
    } catch (err) {
        console.error('[Notifications] Failed to get push token:', err);
        return null;
    }
}

/**
 * Persists a received notification to the local inbox (AsyncStorage).
 * New items are prepended so the list stays newest-first.
 *
 * @param {Notifications.Notification} notification - The raw Expo notification object.
 * @returns {Promise<void>}
 */
export async function saveNotification(notification) {
    try {
        const raw = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];

        const item = {
            id: notification.request.identifier,
            title: notification.request.content.title ?? 'New Message',
            body: notification.request.content.body ?? '',
            data: notification.request.content.data ?? {},
            timestamp: Date.now(),
            read: false,
        };

        const updated = [item, ...existing];
        await AsyncStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
        console.error('[Notifications] Failed to save notification:', err);
    }
}

/**
 * Marks a single notification as read and persists the change.
 *
 * @param {string} id - The notification identifier.
 * @returns {Promise<void>}
 */
export async function markNotificationRead(id) {
    try {
        const raw = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
        if (!raw) return;
        const items = JSON.parse(raw).map(n => (n.id === id ? { ...n, read: true } : n));
        await AsyncStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
        console.error('[Notifications] Failed to mark notification as read:', err);
    }
}

/**
 * Clears all saved notifications from local storage.
 *
 * @returns {Promise<void>}
 */
export async function clearAllNotifications() {
    try {
        await AsyncStorage.removeItem(INBOX_STORAGE_KEY);
        await Notifications.dismissAllNotificationsAsync();
    } catch (err) {
        console.error('[Notifications] Failed to clear notifications:', err);
    }
}
