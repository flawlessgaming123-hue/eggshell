/**
 * index.js  –  Firebase Cloud Functions entry point
 *
 * Exports a single HTTP function `shopifyWebhooks` that acts as an Express
 * router. Shopify sends signed POST requests to the registered URL; this
 * function verifies the HMAC signature then delegates to the appropriate
 * handler based on the X-Shopify-Topic header.
 *
 * Webhook registration (Shopify Admin → Notifications → Webhooks):
 *   URL: https://<region>-<project-id>.cloudfunctions.net/shopifyWebhooks
 *
 * Supported topics:
 *   orders/create  · orders/paid  · orders/fulfilled  · orders/cancelled
 *   products/create  · products/update
 *   checkouts/create  · checkouts/update
 */

"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");

const verifyShopifyWebhook = require("./verifyShopifyWebhook");
const {
    handleOrderCreate,
    handleOrderPaid,
    handleOrderFulfilled,
    handleOrderCancelled,
} = require("./handlers/orders");
const { handleProductCreate, handleProductUpdate } = require("./handlers/products");
const { handleCheckoutCreate, handleCheckoutUpdate } = require("./handlers/checkouts");

// ---------------------------------------------------------------------------
// Initialise Firebase Admin SDK (uses Application Default Credentials when
// deployed; points to your project automatically via GOOGLE_APPLICATION_CREDENTIALS
// or the service account attached to the Cloud Function).
// ---------------------------------------------------------------------------
admin.initializeApp();

// Set a default region. Change to your preferred region.
setGlobalOptions({ region: "us-central1" });

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

/**
 * IMPORTANT: express.raw() must come BEFORE verifyShopifyWebhook so that the
 * raw body Buffer is available for HMAC computation. Do NOT use express.json()
 * as the primary body parser here.
 */
app.use(express.raw({ type: "application/json" }));

// Apply HMAC verification to every route in this router.
app.use(verifyShopifyWebhook);

// ---------------------------------------------------------------------------
// Route table  –  keyed on X-Shopify-Topic header value
// ---------------------------------------------------------------------------

/** Generic topic-based dispatcher */
app.post("/", async (req, res) => {
    const topic = req.headers["x-shopify-topic"];

    if (!topic) {
        console.warn("Request is missing X-Shopify-Topic header");
        return res.status(400).json({ error: "Missing X-Shopify-Topic header" });
    }

    console.log(`Received Shopify webhook: ${topic}`);

    switch (topic) {
        // ── Orders ──────────────────────────────────────────────────────────────
        case "orders/create":
            return handleOrderCreate(req, res);
        case "orders/paid":
            return handleOrderPaid(req, res);
        case "orders/fulfilled":
            return handleOrderFulfilled(req, res);
        case "orders/cancelled":
            return handleOrderCancelled(req, res);

        // ── Products ─────────────────────────────────────────────────────────────
        case "products/create":
            return handleProductCreate(req, res);
        case "products/update":
            return handleProductUpdate(req, res);

        // ── Checkouts / Abandoned Carts ──────────────────────────────────────────
        case "checkouts/create":
            return handleCheckoutCreate(req, res);
        case "checkouts/update":
            return handleCheckoutUpdate(req, res);

        // ── Unknown / unregistered topic ─────────────────────────────────────────
        default:
            console.warn(`Unhandled Shopify topic: ${topic}`);
            // Return 200 so Shopify doesn't retry an intentionally unhandled topic.
            return res.status(200).json({ received: true, handled: false, topic });
    }
});

// ---------------------------------------------------------------------------
// Export as a Firebase Cloud Function (v2 HTTP trigger)
// ---------------------------------------------------------------------------
exports.shopifyWebhooks = onRequest(app);
