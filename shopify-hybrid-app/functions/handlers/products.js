/**
 * handlers/products.js
 * Handles Shopify product-related webhook events:
 *   - products/create  (new product published to the store)
 *   - products/update  (product details changed)
 *
 * Notifications are sent to the FCM topic configured in config.js so any
 * subscribed device receives the alert.
 */

"use strict";

const { sendToTopic } = require("../fcm");
// BUG-9 FIX: FCM topic sourced from env param — not hardcoded.
const { FCM_STAFF_TOPIC } = require("../config");

/**
 * POST /webhooks/products/create
 * Triggered when a new product is published.
 */
async function handleProductCreate(req, res) {
    try {
        const product = req.shopifyPayload;
        const title = product.title || "New product";
        const vendor = product.vendor ? ` by ${product.vendor}` : "";
        const status = product.status || "active";

        console.log(`New product created: "${title}" (status: ${status})`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "✨ New Product Added",
            body: `"${title}"${vendor} has been added to the store.`,
        }, {
            type: "products/create",
            productId: String(product.id),
            productTitle: title,
            status,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleProductCreate error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /webhooks/products/update
 * Triggered when an existing product is updated.
 */
async function handleProductUpdate(req, res) {
    try {
        const product = req.shopifyPayload;
        const title = product.title || "A product";

        console.log(`Product updated: "${title}"`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "🔄 Product Updated",
            body: `"${title}" has been updated.`,
        }, {
            type: "products/update",
            productId: String(product.id),
            productTitle: title,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleProductUpdate error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = { handleProductCreate, handleProductUpdate };
