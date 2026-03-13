/**
 * fcm.js
 * Thin wrapper around the Firebase Admin SDK for sending FCM messages.
 *
 * All notification-sending logic is centralised here so that webhook
 * handlers stay focused on payload parsing.
 */

"use strict";

const admin = require("firebase-admin");

/**
 * Send a push notification to a single device token.
 *
 * @param {string} token   - FCM registration token of the target device.
 * @param {object} notification - { title: string, body: string }
 * @param {object} [data]  - Arbitrary key/value string payload delivered
 *                           to the app alongside the notification.
 * @returns {Promise<string>} FCM message ID on success.
 */
async function sendToDevice(token, notification, data = {}) {
    const message = {
        token,
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: stringifyValues(data),
        android: {
            notification: {
                sound: "default",
                // BUG-3 FIX: Channel ID changed from "shopify_notifications" to "default"
                // to match the channel registered client-side in notifications.js.
                // On Android 8+, a notification sent to an unregistered channel is silently dropped.
                channelId: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    const response = await admin.messaging().send(message);
    console.log("FCM message sent to device:", response);
    return response;
}

/**
 * Send a push notification to a named FCM topic.
 * All devices subscribed to the topic will receive the message.
 *
 * @param {string} topic  - Topic name (no leading slash, e.g. "all_users").
 * @param {object} notification - { title: string, body: string }
 * @param {object} [data]
 * @returns {Promise<string>} FCM message ID on success.
 */
async function sendToTopic(topic, notification, data = {}) {
    const message = {
        topic,
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: stringifyValues(data),
        android: {
            notification: {
                sound: "default",
                // BUG-3 FIX: Channel ID aligned with the client-registered channel "default".
                channelId: "default",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    const response = await admin.messaging().send(message);
    console.log(`FCM message sent to topic "${topic}":`, response);
    return response;
}

/**
 * FCM data payloads only accept string values.
 * This helper coerces all values in an object to strings.
 * @param {object} obj
 * @returns {object}
 */
function stringifyValues(obj) {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
            k,
            typeof v === "string" ? v : JSON.stringify(v),
        ])
    );
}

module.exports = { sendToDevice, sendToTopic };
