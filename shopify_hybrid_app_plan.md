# Shopify Hybrid App - Master Project Plan

> **Legend**: ✅ Complete | 🔄 In Progress | ⏳ Pending | ⚠️ Blocked | 🐛 Bug Open | 🔒 Bug Fixed


## Project Brief
White-label hybrid app shell for Shopify stores. Provides enough native value to pass App Store reviews while keeping development costs low.

## Tech Stack
*   **Framework**: React Native with Expo/CLI
*   **Backend**: Firebase (Cloud Messaging for push notifications, Firestore for notification inbox)
*   **Integration**: Native WebView with Custom JS Injection

## Core Features & Architecture
*   **Native Navigation**: Permanent bottom tab bar — Home (WebView) + Inbox (Notifications)
*   **Shopify WebView**: JS injection strips mobile header/footer/nav for a 100% native look
*   **Push Notifications & Inbox**: FCM alerts saved to a native Inbox. Key for App Store approval
*   **Webhook Setup**: Shopify webhooks → Cloud Functions → FCM push. Fully modular for multi-client rebranding

---

## Phase Status Overview

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Scaffold project, app icons, bottom nav bar | ✅ Complete |
| 2 | WebView component + JS injection | ✅ Complete |
| 3 | Firebase init, Inbox UI, FCM listener | ✅ Complete |
| 4 | Cloud Functions, Shopify webhook catchers | ✅ Complete |

---

## Phase 1: Scaffold & Navigation ✅ COMPLETE
**Completed**: 2026-03-05

**Files produced**:
- `App.js` — NavigationContainer, bottom tabs (Home + Inbox), Ionicons
- `src/screens/HomeScreen.js` — placeholder (to be replaced in Phase 2)
- `src/screens/InboxScreen.js` — placeholder (to be replaced in Phase 3)

**Packages installed**: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`

---

## Phase 2: Shopify WebView & DOM Manipulation ✅ COMPLETE

**Completed**: 2026-03-05

**What was built**:
- `SHOPIFY_STORE_URL` white-label constant at the top of the file
- `WebView` with `injectedJavaScriptBeforeContentLoaded` to prevent layout flicker
- Double-injection fallback via `webviewRef.current.injectJavaScript()` on `onLoadEnd`
- Android hardware back button handler — navigates back within WebView if `canGoBack`
- `ActivityIndicator` loading overlay (toggled via `onLoadStart` / `onLoadEnd`)
- `SafeAreaView` + `StatusBar` for full-screen native feel
- `bounces={false}`, `overScrollMode="never"`, hidden scroll indicators

**Files produced**:
- `src/screens/HomeScreen.js`

---

## Phase 3: Push Notifications & Inbox UI ✅ COMPLETE

**Completed**: 2026-03-05

**What was built**:

`src/utils/notifications.js`:
- Firebase app initialised once (double-init guard for hot-reload)
- `registerForPushNotificationsAsync()` — physical device guard, Android notification channel setup, permission request, Expo push token retrieval
- `saveNotification(notification)` — persists incoming FCM payloads to AsyncStorage (newest-first)
- `markNotificationRead(id)` — marks a single notification read and persists
- `clearAllNotifications()` — wipes AsyncStorage + dismisses OS notifications
- `INBOX_STORAGE_KEY` constant exported for shared use

`src/screens/InboxScreen.js`:
- Foreground FCM listener via `Notifications.addNotificationReceivedListener` (cleaned up on unmount)
- Pull-to-refresh on the `FlatList`
- `NotificationCard` component — unread green left-border accent, read-dot indicator, relative timestamp ("2m ago", "3h ago", date)
- Unread count badge on the header
- "Clear all" button with OS notification dismissal
- Empty state ("All caught up") when inbox is empty
- Shopify green (`#008060`) brand colour throughout

> ⚠️ **Action required before testing**: Fill in `firebaseConfig` in `src/utils/notifications.js` with your project's values from the Firebase console.

**Files produced**:
- `src/utils/notifications.js` — new file
- `src/screens/InboxScreen.js` — replaces placeholder

---

## Phase 4: Server-Side Webhook Architecture ✅ COMPLETE
**Completed**: 2026-03-05

**Files produced**:
- `functions/index.js` — Cloud Function HTTP endpoints
- `functions/verifyShopifyWebhook.js` — HMAC-SHA256 signature verification middleware
- `functions/fcm.js` — FCM send logic via Firebase Admin SDK
- `functions/config.js` — `SHOPIFY_WEBHOOK_SECRET` env param (Firebase Functions v2)
- `functions/handlers/orders.js` — Order paid/fulfilled webhook handler
- `functions/handlers/checkouts.js` — Abandoned cart webhook handler
- `functions/handlers/products.js` — New product webhook handler
- `functions/.env.example` — Environment variable reference
- `functions/package.json` — Functions dependencies

**Packages**: Firebase Admin SDK, Firebase Functions v2, Node.js crypto (built-in)

---

## JS Injection Reference

```javascript
const hideShopifyUI = `
  const style = document.createElement('style');
  style.innerHTML = \`
    #shopify-section-header, #shopify-section-footer,
    #shopify-section-announcement-bar,
    header, footer, .site-header, .site-footer,
    .mobile-nav-wrapper, .chat-app-wrapper { display: none !important; }
    body { padding-top: 0 !important; padding-bottom: 0 !important; margin: 0 !important; }
  \`;
  document.head.appendChild(style);
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'viewport');
  meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  document.getElementsByTagName('head')[0].appendChild(meta);
  true;
`;
```

---

## QA & Bug Tracking

### QA Agent Prompt *(paste to QA agent)*

---

> **Role**: You are the QA Engineer for a white-label hybrid Shopify app built in React Native (Expo).
>
> **Task**: Perform a full static code review of the project. You must read every source file listed below and identify any bugs, missing error handling, App Store compliance risks, or integration mismatches between the frontend and backend.
>
> **Files to review**:
> - `App.js`
> - `src/screens/HomeScreen.js`
> - `src/screens/InboxScreen.js`
> - `src/utils/notifications.js`
> - `functions/index.js`
> - `functions/config.js`
> - `functions/fcm.js`
> - `functions/verifyShopifyWebhook.js`
> - `functions/handlers/orders.js`
> - `functions/handlers/checkouts.js`
> - `functions/handlers/products.js`
>
> **What to check for**:
> - Missing `try/catch` or unhandled Promise rejections
> - Race conditions or missing cleanup (e.g., listener leaks, missing `useEffect` return)
> - App Store / Play Store compliance gaps (permissions, push notification handling, WebView policy)
> - Integration contract mismatches — e.g., the FCM payload shape sent by `functions/fcm.js` must match what `InboxScreen.js` / `notifications.js` reads
> - White-label / multi-client risks (hardcoded values that should be config)
> - Android vs iOS behavioural differences not accounted for
> - Security issues in the Cloud Functions (webhook verification, env variable exposure)
> - Missing loading or error states in the UI
> - Any import, dependency, or SDK version incompatibilities
>
> **For every problem you find, produce one bug ticket using this exact format**:
>
> ---
>
> **Bug ID**: BUG-[N] *(increment per bug found)*
>
> **Severity**: Critical | High | Medium | Low
>
> **Status**: 🐛 Open
>
> **Agent Role**: You are the [Frontend / Backend / Full-Stack] Bug Fix Specialist for a hybrid Shopify app.
>
> **Affected File(s)**: `path/to/file.js`
>
> **Description**: *(1–2 sentences: what is broken and what the impact is)*
>
> **Steps to Reproduce / Root Cause**: *(exact line reference and explanation)*
>
> **Technical Constraints**:
> - Fix only the code in the affected file(s) listed above.
> - Do not change unrelated logic, navigation, or other phases' files.
> - The fix must be compatible with Expo SDK 55 and React Native 0.76+.
>
> **Dependencies**: *(what this bug fix receives from and what it passes to)*
>
> **Deliverables**: Provide only the corrected code for the affected file(s). No markdown explanations unless a setup step is required.
>
> ---
>
> After all tickets, provide a **QA Summary** table:
>
> | Bug ID | Severity | File | One-line description |
> |--------|----------|------|----------------------|
>
> Do not attempt to fix any bugs yourself. Your only output is the bug tickets and the summary table.

---

### Bug Log

> *This section is maintained by the QA agent and fix agents. Update status to 🔒 Fixed when resolved.*

| Bug ID | Severity | Status | File | Description |
|--------|----------|--------|------|-------------|
| BUG-1 | Critical | � Fixed | `src/utils/notifications.js` | Empty Firebase config committed — Firebase never initialises |
| BUG-2 | Critical | � Fixed | `src/utils/notifications.js` | `getExpoPushTokenAsync()` missing `projectId` — push tokens always null |
| BUG-3 | High | � Fixed | `fcm.js` + `notifications.js` | Android channel ID mismatch — all push silently dropped on Android 8+ |
| BUG-4 | High | � Fixed | `functions/verifyShopifyWebhook.js` | `timingSafeEqual` crashes on non-ASCII HMAC headers |
| BUG-5 | High | � Fixed | `src/screens/InboxScreen.js` | `useEffect` async IIFE missing `try/catch` — spinner hangs forever on error |
| BUG-6 | High | � Fixed | `src/screens/InboxScreen.js` | Async listener callback unhandled — causes unhandled rejection crash |
| BUG-7 | High | � Fixed | `src/screens/HomeScreen.js` | No `onError`/`onHttpError` on WebView — native browser error on network fail |
| BUG-8 | High | � Fixed | `src/utils/notifications.js` | `import` statements after `initializeApp` — ESM non-compliance |
| BUG-9 | Medium | � Fixed | `HomeScreen.js` + `handlers/*.js` | Hardcoded store URL and FCM topic — white-label config not externalised |
| BUG-10 | Medium | � Fixed | `functions/config.js` | `SHOPIFY_WEBHOOK_SECRET` has `default: ""` — broken deploys succeed silently |
| BUG-11 | Medium | � Fixed | `src/screens/HomeScreen.js` | `user-scalable=no` violates App Store accessibility guidelines |
| BUG-12 | Medium | � Fixed | `App.js` + `InboxScreen.js` | `setNotificationHandler` in screen module — not active until Inbox tab is visited |

---

## Client Onboarding & Deployment Pipeline

### Overview

```
✅ Client fills Google Form (LIVE)
        ↓
✅ Responses land in linked Google Sheet (LIVE)
        ↓
⏳ You create clients/<name>.json from the Sheet row
        ↓
⏳ Run Agent 3 → get setup-checklist.md
        ↓
⏳ Work through checklist (Firebase, Shopify webhooks, EAS, App Stores)
        ↓
⏳ node scripts/deploy-client.js → patches all config files
        ↓
⏳ eas build --platform all → submit to stores
```

### Live Assets

| Asset | URL |
|-------|-----|
| 📋 Client Onboarding Form | [Open Form](https://docs.google.com/forms/d/e/1FAIpQLSdbMWA2tB8LvyoKyFQ94SpsBpN9Twc_tLtgl51RW15ccXYEag/viewform) |
| ✏️ Form Editor | [Edit Form](https://docs.google.com/forms/d/1Y5bqjBC5EJIpu7D878iBoxcXSsLXqYvf0HB8c2Ya9JI/edit) |
| 📊 Responses Sheet | [Open Sheet](https://docs.google.com/spreadsheets/d/12PHjzfOqTeX_47rqq8OlzuGFVIZlAVUQ5yNyHd-NCxA/edit) |
| ⚙️ Apps Script Web App | [Live Endpoint](https://script.google.com/macros/s/AKfycbwdTMQ34-iUEblIuShMQVgenWO72BwOICTHza4UVIyv-qtexL15b6CMtI8DVdVZhgVzUw/exec) |
| 🍎 Apple Dev Guide | `client-guides/apple-developer-onboarding.md` |

> ⚠️ **Firebase config, EAS project ID, and all `extra` block values in `app.json` remain as `TODO` placeholders until a client Google Form is received.** Do not fill these in on the base project — they are applied per-client by `deploy-client.js`.

---

### Agent 1: Google Form Builder

> **Role**: You are a Google Apps Script Developer and UX Designer.
>
> **Task**: Create a 10-question Google Form for client onboarding for a Shopify-to-mobile app project. After creation, attach a Google Sheet to collect responses. Return the shareable form URL and the linked Sheet ID.
>
> **Form questions to include** (in this order):
>
> 1. **Business name** *(Short answer — required)*
> 2. **Shopify store URL** *(Short answer, e.g. `https://yourstore.myshopify.com` — required)*
> 3. **Shopify Admin API access token** *(Short answer, password field — required. Add helper text: "Found in Shopify Admin → Apps → Private Apps")*
> 4. **Firebase project ID** *(Short answer — required. Add helper text: "Found in Firebase Console → Project Settings")*
> 5. **Do you have a vector logo? (SVG or AI file)** *(Multiple choice: Yes / No — required)*
>    - **Conditional logic**: If answer is **No**, show the following section:
>      > *"No vector logo? No problem. We offer a professional logo vectorisation and design package for £150. Tick below to add it to your project."*
>      > Checkbox: `[ ] Yes, add the £150 logo design package to my project`
> 6. **Upload your high-res logo** *(File upload — PNG or SVG, max 10 MB — required)*
> 7. **Primary brand hex colour** *(Short answer, e.g. `#008060` — required. Add helper text: "This will be used for the tab bar, buttons, and notification badge")*
> 8. **Secondary brand hex colour** *(Short answer — optional)*
> 9. **App Store / Play Store short description** *(Paragraph, max 80 characters — required. Add helper text: "One sentence shown under your app name in the stores")*
> 10. **App Store / Play Store long description** *(Paragraph, max 4000 characters — required. Add helper text: "Describe your app's features. This appears on your store listing page")*
>
> **Technical Constraints**:
> - Use Google Apps Script to create the form programmatically so it can be re-run for each new client.
> - Link a Google Sheet to the form automatically (use `form.setDestination`).
> - Apply conditional section visibility using `setNavigationAction` for the logo upsell.
> - Do not hard-code any client-specific data into the script.
>
> **Deliverables**: Provide only the Google Apps Script `.gs` file. Include a comment block at the top with instructions for running it.

---

### Agent 2: Deploy Agent — Client Config Patcher

> **Role**: You are the Deploy Automation Specialist for a white-label hybrid Shopify app.
>
> **Task**: Write a Node.js script (`scripts/deploy-client.js`) that reads a single row of client data (from a JSON object or a Google Sheets API call) and automatically patches all white-label configuration points in the project so the app is ready to build under that client's brand.
>
> **Input**: A client config object with the following shape (matching the Google Form fields):
> ```json
> {
>   "businessName": "Acme Store",
>   "shopifyStoreUrl": "https://acme.myshopify.com",
>   "shopifyAdminToken": "shpat_xxxx",
>   "firebaseProjectId": "acme-firebase-id",
>   "primaryColor": "#E63946",
>   "secondaryColor": "#F1FAEE",
>   "appStoreShortDesc": "Shop Acme products anywhere.",
>   "appStoreLongDesc": "Full long description here...",
>   "logoPath": "./client-assets/logo.png"
> }
> ```
> Accept this as a JSON file path argument: `node scripts/deploy-client.js ./clients/acme.json`
>
> **What the script must patch**:
>
> | Target | Field | File |
> |--------|-------|------|
> | Shopify store URL | `SHOPIFY_STORE_URL` constant | `src/screens/HomeScreen.js` |
> | Tab bar active colour | `tabBarActiveTintColor` | `App.js` |
> | Firebase project ID | `projectId` in `firebaseConfig` | `src/utils/notifications.js` |
> | App display name | `name` and `slug` | `app.json` |
> | Android package | `android.package` | `app.json` |
> | iOS bundle ID | `ios.bundleIdentifier` | `app.json` |
> | Short description | `description` | `app.json` |
> | App icon | `icon` path | `app.json` |
> | Notification accent colour | `lightColor` in notification channel | `src/utils/notifications.js` |
>
> **Technical Constraints**:
> - Use only Node.js built-ins (`fs`, `path`) — no extra dependencies.
> - Use regex-safe string replacement (not AST parsing).
> - Create a timestamped backup of every file before patching (e.g. `HomeScreen.js.backup-2026-03-05`).
> - Copy the logo file to `assets/icon.png` and `assets/adaptive-icon.png`.
> - Generate a `clients/<businessName>/config-applied.json` file logging what was patched and when.
> - Print a clear summary to stdout: ✅ for each successful patch, ❌ with reason for any failure.
> - Do not modify `functions/` directory — Firebase project config there is set separately via the Firebase CLI.
>
> **Dependencies**: Reads from a client JSON file. Writes to `src/`, `App.js`, `app.json`, and `assets/`. Outputs a log to `clients/<name>/`.
>
> **Deliverables**: Provide only the code for `scripts/deploy-client.js`. No markdown explanations.

---

### Per-Client Config Reference

When onboarding a new client, create `clients/<business-name>.json` manually from the Google Form response, then run:

```bash
node scripts/deploy-client.js ./clients/<business-name>.json
```

Then build for the client with:

```bash
eas build --platform all --profile production
```

> ⚠️ **Never commit client JSON files to version control.** Add `clients/` to `.gitignore`.

---

### Agent 3: Operator Setup Checklist Generator

> This agent takes a completed client JSON (from the Google Form) and produces a **personalised, step-by-step manual setup guide for you (the developer)** — covering every service that cannot be automated by the deploy script.

---

> **Role**: You are a DevOps and App Deployment Specialist writing instructions for the developer who is onboarding a new client onto a white-label Shopify hybrid app platform.
>
> **Task**: Given the client config JSON below, produce a clear, ordered, **copy-paste-ready setup checklist** that the developer must work through manually before running `deploy-client.js` and triggering an EAS build. Every step must reference the exact value from the client's config where relevant (e.g., use the actual project name, URL, token, colour etc. — not placeholders).
>
> **Client config input** *(replace with real values from the Google Form response)*:
> ```json
> {
>   "businessName": "Acme Store",
>   "shopifyStoreUrl": "https://acme.myshopify.com",
>   "shopifyAdminToken": "shpat_xxxx",
>   "firebaseProjectId": "acme-app-prod",
>   "primaryColor": "#E63946",
>   "secondaryColor": "#F1FAEE",
>   "appStoreShortDesc": "Shop Acme products anywhere.",
>   "appStoreLongDesc": "...",
>   "logoPath": "./client-assets/acme-logo.png",
>   "developerEmail": "you@youragency.com"
> }
> ```
>
> **Produce a checklist with the following sections** (in this order). For each step include: a checkbox `[ ]`, a bold action title, and 2–4 sentences of exact instructions referencing the client's values.
>
> ---
>
> **Section 1 — Firebase Project Setup**
> - Create a new Firebase project named `{firebaseProjectId}` at console.firebase.google.com
> - Enable **Cloud Firestore** (production mode) in the project
> - Enable **Firebase Cloud Messaging** (FCM) — note the Server Key and Sender ID
> - Register an **Android app** with package ID `com.{slug}.android` and an **iOS app** with bundle ID `com.{slug}.ios`
> - Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) and note where to place them
> - Copy the full **Firebase SDK config object** (apiKey, authDomain, projectId, etc.) — this goes into `app.json` `extra` block
> - Set the **Firebase Functions environment variable**: `SHOPIFY_WEBHOOK_SECRET` via `firebase functions:secrets:set` or `.env` file
> - Deploy Cloud Functions: `cd functions && firebase deploy --only functions`
> - Note the deployed **webhook endpoint URLs** (needed for Shopify setup)
>
> **Section 2 — Shopify Webhook Registration**
> - Log into the Shopify Admin for `{shopifyStoreUrl}` using the provided Admin API token
> - Register the following webhooks pointing to the Firebase Cloud Function URLs from Section 1:
>   - `orders/paid` → `[Cloud Function URL]/webhooks/orders`
>   - `orders/fulfilled` → `[Cloud Function URL]/webhooks/orders`
>   - `checkouts/create` (abandoned cart) → `[Cloud Function URL]/webhooks/checkouts`
>   - `products/create` → `[Cloud Function URL]/webhooks/products`
> - Copy the **Shopify webhook signing secret** from the Shopify Partners dashboard and save it as `SHOPIFY_WEBHOOK_SECRET`
> - Test each webhook using Shopify's "Send test notification" button
>
> **Section 3 — Expo & EAS Project Setup**
> - Create or link an Expo account for this client at expo.dev
> - Run `eas init` inside the project directory to create a new EAS project — name it `{businessName}`
> - Copy the generated **EAS project ID** and add it to `app.json` under `extra.eas.projectId`
> - Configure `eas.json` with `production` profile for both iOS and Android
> - Add `google-services.json` to the project root (Android FCM requirement)
>
> **Section 4 — Apple App Store Setup** *(requires client to have completed Apple Developer enrolment)*
> - Log into App Store Connect at appstoreconnect.apple.com
> - Create a new App with bundle ID `com.{slug}.ios`
> - Set the app name to `{businessName}`, short description to `{appStoreShortDesc}`
> - Paste `{appStoreLongDesc}` into the "Description" field
> - Upload the logo as the App Icon (1024×1024 PNG, no transparency)
> - Create an **App-Specific Shared Secret** for push notifications (Settings → App Information)
> - Register an **APNs key** (Certificates, Identifiers & Profiles → Keys) and upload it to Firebase Console → Project Settings → Cloud Messaging → iOS App
>
> **Section 5 — Google Play Store Setup**
> - Log into Google Play Console at play.google.com/console
> - Create a new app with package name `com.{slug}.android`
> - Set the app name to `{businessName}`, short description to `{appStoreShortDesc}`
> - Paste `{appStoreLongDesc}` into the "Full description" field
> - Upload the logo as the Hi-res icon (512×512 PNG)
> - Note: FCM on Android is handled automatically via `google-services.json` — no extra setup needed
>
> **Section 6 — Run the Deploy Script**
> - Ensure `clients/{slug}.json` is created with all values filled in
> - Run: `node scripts/deploy-client.js ./clients/{slug}.json`
> - Confirm all ✅ patches applied in the terminal output
> - Verify `app.json` shows correct name, bundle IDs, and icon path
> - Verify `src/utils/notifications.js` has the correct Firebase config values
>
> **Section 7 — Build & Submit**
> - Run `eas build --platform android --profile production` — note build URL
> - Run `eas build --platform ios --profile production` — note build URL
> - Once builds complete: `eas submit --platform android` and `eas submit --platform ios`
> - Send client the TestFlight invite link (iOS) and Play Store internal test link (Android) for sign-off
>
> ---
>
> **Format**: Output a clean markdown document with `##` section headings and `- [ ]` checkboxes for each action. Use the actual client values throughout — not placeholder text. Title the document `# Client Setup Checklist — {businessName}`. The document should be saveable as `clients/{slug}/setup-checklist.md`.
>
> **Deliverable**: The complete checklist markdown document only. No preamble or commentary.

---

### Per-Client Config Reference

When onboarding a new client:

1. Receive Google Form response → create `clients/<business-name>.json`
2. Give `clients/<name>.json` to **Agent 3** → get back `setup-checklist.md`
3. Work through `setup-checklist.md` top to bottom
4. Run `node scripts/deploy-client.js ./clients/<business-name>.json`
5. Run `eas build --platform all --profile production`

```bash
node scripts/deploy-client.js ./clients/<business-name>.json
eas build --platform all --profile production
```

> ⚠️ **Never commit client JSON files to version control.** Add `clients/` to `.gitignore`.

---

## Client Resources

### Agent: Apple Developer Program Onboarding Guide

> **Role**: You are a Technical Writer specialising in plain-English guides for non-technical UK small business owners.
>
> **Task**: Write a simple, jargon-free 5-step guide explaining how a UK Ltd company owner can register their business on the Apple Developer Program and then invite a developer (me) as an Admin user. The guide must read as if you're explaining it to someone who has never dealt with Apple developer accounts before.
>
> **Writing constraints**:
> - UK English throughout (e.g. "organisation" not "organization", pound sign not dollar).
> - No technical jargon. Where a technical term is unavoidable, explain it in brackets immediately after — e.g. *"bundle identifier (a unique name Apple uses to identify your app)"*.
> - Use a friendly, reassuring tone — assume the reader is capable but nervous about making a mistake.
> - Each step must have: a **bold heading**, **2–4 short sentences** of instruction, and a clearly marked screenshot placeholder on its own line in this exact format:
>   `📸 *[Screenshot: brief description of what the screenshot should show]*`
> - Keep each step scannable — no walls of text.
> - Include a short **"Before You Start" checklist** at the very top with everything the client needs to have ready (D-U-N-S number, company details, credit card, Apple ID etc.).
> - Include a short **"What Happens Next"** paragraph at the end telling them what to expect after they've sent the invite.
>
> **5 Steps to cover**:
> 1. Enrolling as an Organisation on the Apple Developer Program website (not Individual)
> 2. Completing the D-U-N-S number check and company verification
> 3. Paying the annual £99 Apple Developer Program fee
> 4. Accessing App Store Connect and navigating to Users & Access
> 5. Inviting the developer by email with the Admin role selected
>
> **Format**: Output clean markdown. Use `##` for the main title, `###` for "Before You Start" and "What Happens Next", and `#### Step N: Title` for each step. Do not use HTML. Do not add any commentary outside of the guide itself.
>
> **Deliverable**: The complete guide as a single markdown document, ready to be saved as `client-guides/apple-developer-onboarding.md` and dropped into Notion, Google Docs, or a PDF export tool.

---

### Agent: Cold Email — Shopify Mobile App Pitch

> **Role**: You are a direct-response copywriter specialising in B2B sales emails for UK digital agencies.
>
> **Task**: Write a short, punchy cold email pitching a £3,950 hybrid mobile app build to Shopify store owners. The email must feel personal and commercially savvy — not a template blast. It should get the reader to reply or book a call, not click a link.
>
> **Context about the product** (use this to make the pitch specific and credible):
> - We build a native iOS and Android app that wraps the client's existing Shopify store — no rebuilding their store, no platform migration
> - The app looks and feels 100% native because we inject CSS to hide the Shopify header/footer and rely on a native bottom navigation bar instead
> - Firebase push notifications are wired directly to Shopify order events (order confirmed, shipped, abandoned cart reminders) — all automated
> - A native Notification Inbox (required by Apple for App Store approval) means customers can review past messages even with notifications off
> - The typical Shopify store sees 3–5× higher repeat purchase rate from app users vs. mobile web visitors (cite this as a known industry benchmark — do not fabricate a source)
> - App is on Apple App Store and Google Play under the client's own brand and developer account
> - Two ongoing retainer tiers are available after launch:
>   - **Essential Hosting & Maintenance — £49/month**: App stays live, OS updates handled, Firebase infrastructure maintained
>   - **Growth & Campaign Management — £149/month**: Everything in Essential, plus monthly push notification campaigns, abandoned cart sequences, and a monthly performance report
>
> **Email constraints**:
> - UK English. Genuine, direct tone — no buzzwords, no "I hope this email finds you well"
> - Subject line: punchy, curiosity-driven, under 8 words. Provide 3 subject line options
> - Body: 120–160 words maximum. Tight paragraphs, no bullet lists
> - Lead with a commercial insight or pain point (customer retention is expensive; push notifications drive repeat purchases), not a feature list
> - Introduce the £3,950 build price naturally — frame it as an investment with a clear ROI angle, not a cost
> - Mention both retainer tiers briefly in 1–2 sentences — position them as optional but logical next steps, not upsells
> - Close with a single, low-friction CTA: offer a 15-minute call to show them a live demo
> - P.S. line: add one sentence reinforcing urgency or social proof
>
> **Deliverable**: 3 subject line options, then the full email body. Output as plain text, ready to paste into an email client. No markdown formatting in the email itself. Save as `client-guides/cold-email-shopify-pitch.txt`.
