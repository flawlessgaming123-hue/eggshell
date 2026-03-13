/**
 * handlers/orders.js
 * Handles Shopify order-related webhook events:
 *   - orders/create    (new order placed)
 *   - orders/paid      (payment confirmed)
 *   - orders/fulfilled (order shipped/fulfilled)
 *   - orders/cancelled (order cancelled)
 *
 * Each handler receives the verified Shopify payload (req.shopifyPayload)
 * and sends an appropriate FCM push notification via the fcm helper.
 */

"use strict";

const { sendToTopic } = require("../fcm");
// BUG-9 FIX: FCM topic is now sourced from an env param so each white-label
// client can have its own namespaced topic without editing source code.
const { FCM_STAFF_TOPIC } = require("../config");

/**
 * POST /webhooks/orders/create
 * Triggered when a customer places a new order.
 */
async function handleOrderCreate(req, res) {
    try {
        const order = req.shopifyPayload;
        const orderName = order.name || `#${order.order_number}`;
        const customerName = order.customer
            ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
            : "A customer";
        const total = order.total_price || "0.00";
        const currency = order.currency || "USD";

        console.log(`New order received: ${orderName}`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "🛍️ New Order Received",
            body: `${customerName} placed order ${orderName} for ${currency} ${total}`,
        }, {
            type: "orders/create",
            orderId: String(order.id),
            orderName,
            total,
            currency,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleOrderCreate error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /webhooks/orders/paid
 * Triggered when an order's payment is confirmed.
 */
async function handleOrderPaid(req, res) {
    try {
        const order = req.shopifyPayload;
        const orderName = order.name || `#${order.order_number}`;

        console.log(`Order paid: ${orderName}`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "💳 Payment Confirmed",
            body: `Payment confirmed for order ${orderName}`,
        }, {
            type: "orders/paid",
            orderId: String(order.id),
            orderName,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleOrderPaid error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /webhooks/orders/fulfilled
 * Triggered when all line items in an order are fulfilled (shipped).
 */
async function handleOrderFulfilled(req, res) {
    try {
        const order = req.shopifyPayload;
        const orderName = order.name || `#${order.order_number}`;
        const trackingNumbers =
            order.fulfillments?.flatMap((f) => f.tracking_numbers ?? []) ?? [];
        const trackingInfo =
            trackingNumbers.length > 0
                ? ` Tracking: ${trackingNumbers.join(", ")}`
                : "";

        console.log(`Order fulfilled: ${orderName}`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "📦 Order Shipped",
            body: `Order ${orderName} has been fulfilled.${trackingInfo}`,
        }, {
            type: "orders/fulfilled",
            orderId: String(order.id),
            orderName,
            trackingNumbers: JSON.stringify(trackingNumbers),
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleOrderFulfilled error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /webhooks/orders/cancelled
 * Triggered when an order is cancelled.
 */
async function handleOrderCancelled(req, res) {
    try {
        const order = req.shopifyPayload;
        const orderName = order.name || `#${order.order_number}`;
        const reason = order.cancel_reason || "unspecified";

        console.log(`Order cancelled: ${orderName}`);

        await sendToTopic(FCM_STAFF_TOPIC.value(), {
            title: "❌ Order Cancelled",
            body: `Order ${orderName} was cancelled. Reason: ${reason}`,
        }, {
            type: "orders/cancelled",
            orderId: String(order.id),
            orderName,
            cancelReason: reason,
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("handleOrderCancelled error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    handleOrderCreate,
    handleOrderPaid,
    handleOrderFulfilled,
    handleOrderCancelled,
};
