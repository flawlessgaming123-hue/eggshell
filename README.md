# Shopify Hybrid App Shell

A white-label hybrid mobile application shell designed for Shopify stores. Built with React Native (Expo) and Firebase, this template provides enough native functionality (like push notifications and native navigation) to easily pass App Store and Google Play reviews while keeping development and maintenance costs exceptionally low.

## 🚀 Core Features
*   **100% Native Feel**: Uses a persistent native bottom tab bar combined with a seamless WebView.
*   **Smart Shopify WebView**: Custom JavaScript injection strips out the mobile web header, footer, and navigation to make the store look fully native.
*   **Native Push Notifications**: Integrates Firebase Cloud Messaging (FCM) to deliver push alerts that are saved to a dedicated native Inbox UI. 
*   **Serverless Webhooks**: Modular Firebase Cloud Functions catch Shopify webhooks (e.g., new orders, abandoned carts) and trigger push notifications automatically.

## 🛠 Tech Stack
*   **Frontend**: React Native, Expo CLI, React Navigation
*   **Backend**: Firebase Admin SDK, Firebase Cloud Functions v2
*   **Storage & Messaging**: Firestore (Inbox) & Firebase Cloud Messaging (FCM)
*   **Integration**: `react-native-webview` with custom DOM manipulation

## 📦 Project Architecture
1.  **Navigation**: Scaffolded project with `App.js` defining a bottom tab navigator separating the Home (WebView) and Inbox screens.
2.  **WebView Integration**: A highly optimized WebView that injects CSS to hide web UI elements, handles Android hardware back-button, and ensures no layout flickering.
3.  **Inbox & Push**: FCM integration to request notification permissions, receive payloads, and persist them locally. Includes a native Inbox UI with unread indicators and a clear-all function.
4.  **Shopify Cloud Functions**: Server-side handlers that verify Shopify HMAC-SHA256 webhook signatures and dispatch FCM pushes for store events (`orders/paid`, `checkouts/create`, etc.).

## ⚙️ Client Deployment
This repository is configured for rapid multi-client deployment. 
A built-in deployment script (`scripts/deploy-client.js`) reads a client's JSON configuration and automatically patches all white-label configuration points (colors, store URLs, bundle IDs, Firebase properties) before building the app via Expo Application Services (`eas build`).

---
*This is a master template designed for creating scalable, rapid-deployment mobile apps for e-commerce clients without full platform migration.*
