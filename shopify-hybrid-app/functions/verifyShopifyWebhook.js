/**
 * verifyShopifyWebhook.js
 * Middleware that validates the Shopify HMAC-SHA256 signature on every
 * incoming webhook request. Requests that fail verification are rejected
 * with HTTP 401 before any handler logic runs.
 *
 * Shopify signs each webhook body using the shared secret and places the
 * base64-encoded HMAC in the `X-Shopify-Hmac-Sha256` header.
 */

"use strict";

const crypto = require("crypto");
const { SHOPIFY_WEBHOOK_SECRET } = require("./config");

/**
 * Express middleware – must be applied BEFORE express.json() or
 * any body-parser middleware so the raw body is still available.
 *
 * Usage:
 *   app.use(express.raw({ type: "application/json" }));
 *   app.use(verifyShopifyWebhook);
 */
function verifyShopifyWebhook(req, res, next) {
    const shopifyHmac = req.headers["x-shopify-hmac-sha256"];

    if (!shopifyHmac) {
        console.warn("verifyShopifyWebhook: missing X-Shopify-Hmac-Sha256 header");
        return res.status(401).json({ error: "Missing HMAC header" });
    }

    const secret = SHOPIFY_WEBHOOK_SECRET.value();

    if (!secret) {
        console.error(
            "verifyShopifyWebhook: SHOPIFY_WEBHOOK_SECRET is not configured"
        );
        return res.status(500).json({ error: "Server misconfiguration" });
    }

    // req.body is a Buffer when express.raw() is used
    const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));

    const digest = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("base64");

    // BUG-4 FIX: Convert BOTH strings to Buffer first so that the length
    // comparison is done on byte-lengths (UTF-8), not on JS string code-unit
    // lengths (UTF-16). This prevents crypto.timingSafeEqual from throwing a
    // TypeError when a non-ASCII character in the header makes the UTF-8 byte
    // length diverge from the UTF-16 code-unit count, even when string lengths match.
    const hmacBuffer = Buffer.from(shopifyHmac, "utf8");
    const digestBuffer = Buffer.from(digest, "utf8");

    // Constant-time comparison — only safe when buffers are equal length.
    const isValid =
        hmacBuffer.length === digestBuffer.length &&
        crypto.timingSafeEqual(hmacBuffer, digestBuffer);

    if (!isValid) {
        console.warn("verifyShopifyWebhook: HMAC validation failed");
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach parsed body for downstream handlers
    req.shopifyPayload =
        typeof req.body === "string"
            ? JSON.parse(req.body)
            : Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString("utf8"))
                : req.body;

    return next();
}

module.exports = verifyShopifyWebhook;
