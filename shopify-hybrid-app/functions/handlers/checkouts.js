/**
 * handlers/checkouts.js
 * Handles Shopify checkout/cart-related webhook events:
 *   - checkouts/create  (a checkout is created – potential lead)
 *   - checkouts/update  (checkout updated, e.g. email added)
 *
 * For abandoned cart recovery, Shopify's native "checkouts/delete" or
 * the "abandoned_checkouts.json" REST polling approach is recommended for
 * production. These handlers cover the real-time notification side.
 */

"use strict";

const { sendToTopic } = require("../fcm");
// BUG-9 FIX: FCM topic sourced from env param — not hardcoded.
const { FCM_STAFF_TOPIC } = require("../config");

/**
 * POST /webhooks/checkouts/create
 * Triggered when a checkout session starts.
 */
async function handleCheckoutCreate(req, res) {
    try {
        const checkout = req.shopifyPayload;
        const email = checkout.email || "unknown customer";
        const total = checkout.total_price || "0.00";
        const currency = checkout.currency || "USD";

        console.log(`New checkout started by: ${email}`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "🛒 Checkout Started",
            body: `${email} started a checkout for ${currency} ${total}`,
        }, {
            type: "checkouts/create",
            checkoutId: String(checkout.id || checkout.token || ""),
            email,
            total,
            currency,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleCheckoutCreate error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /webhooks/checkouts/update
 * Triggered on every checkout update. Useful to detect when a customer
 * adds their email (enabling abandoned cart targeting).
 */
async function handleCheckoutUpdate(req, res) {
    try {
        const checkout = req.shopifyPayload;
        const email = checkout.email;

        // Only notify if the customer has provided their email, indicating
        // they are a recoverable lead if they don't complete the purchase.
        if (!email) {
            return res.status(200).json({ success: true, skipped: "no email" });
        }

        const total = checkout.total_price || "0.00";
        const currency = checkout.currency || "USD";
        const abandonedUrl = checkout.abandoned_checkout_url || "";

        console.log(`Checkout updated, potential abandoned cart: ${email}`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "⚠️ Potential Abandoned Cart",
            body: `${email} has ${currency} ${total} in their cart and hasn't checked out.`,
        }, {
            type: "checkouts/update",
            checkoutId: String(checkout.id || checkout.token || ""),
            email,
            total,
            currency,
            abandonedUrl,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleCheckoutUpdate error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = { handleCheckoutCreate, handleCheckoutUpdate };
