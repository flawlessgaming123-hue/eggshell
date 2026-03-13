/**
 * config.js
 * Central configuration for the Cloud Functions.
 *
 * Set environment variables via a .env file in the /functions directory.
 * See: https://firebase.google.com/docs/functions/config-env
 *
 * Example functions/.env:
 *   SHOPIFY_WEBHOOK_SECRET=your_secret_here
 *   FCM_TOPIC=all_staff
 */

"use strict";

const { defineString } = require("firebase-functions/params");

// ---------------------------------------------------------------------------
// Shopify webhook HMAC secret — used to verify every incoming webhook.
// Set as SHOPIFY_WEBHOOK_SECRET in functions/.env (never commit this file).
//
// BUG-10 FIX: The `default` option has been removed. Without a default,
// Firebase Functions v2 will FAIL FAST at deploy time if this variable is
// not set, preventing a misconfigured function from reaching production.
// ---------------------------------------------------------------------------
const SHOPIFY_WEBHOOK_SECRET = defineString("SHOPIFY_WEBHOOK_SECRET", {
    description: "Shopify webhook signing secret (found in Partners dashboard)",
});

// ---------------------------------------------------------------------------
// FCM topic name — controls which subscriber group receives merchant-facing
// push notifications.
//
// BUG-9 FIX: Topic name is an env param so it can be namespaced per client
// (e.g. "acme_staff") without editing source code.
// Default is "all_staff" for backwards compatibility during local dev.
// ---------------------------------------------------------------------------
const FCM_STAFF_TOPIC = defineString("FCM_STAFF_TOPIC", {
    description: "FCM topic to send merchant/staff push notifications to (e.g. acme_staff)",
    default: "all_staff",
});

module.exports = { SHOPIFY_WEBHOOK_SECRET, FCM_STAFF_TOPIC };
