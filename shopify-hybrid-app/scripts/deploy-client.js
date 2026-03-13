#!/usr/bin/env node
/**
 * deploy-client.js
 *
 * White-label patch script for the Shopify Hybrid App template.
 *
 * Usage:
 *   node scripts/deploy-client.js ./clients/<client-name>.json
 *
 * What it does:
 *   1. Reads the client JSON config from the path provided as a CLI argument.
 *   2. Creates a timestamped backup of every file it is about to touch.
 *   3. Patches the white-label placeholder values in:
 *        - app.json
 *        - App.js              (currently no text placeholders, but backed up for safety)
 *        - src/utils/notifications.js  (same — config is runtime-only via Constants)
 *   4. Prints a ✅ / ❌ summary to stdout.
 *
 * No external dependencies — only Node.js built-ins (fs, path, process).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Resolve paths ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');   // repo root

const TARGET_FILES = {
    appJson: path.join(ROOT, 'app.json'),
    appJs: path.join(ROOT, 'App.js'),
    notifications: path.join(ROOT, 'src', 'utils', 'notifications.js'),
};

// ─── CLI argument validation ───────────────────────────────────────────────────

const clientConfigArg = process.argv[2];

if (!clientConfigArg) {
    console.error('\n❌  Usage: node scripts/deploy-client.js ./clients/<client-name>.json\n');
    process.exit(1);
}

const clientConfigPath = path.resolve(process.cwd(), clientConfigArg);

if (!fs.existsSync(clientConfigPath)) {
    console.error(`\n❌  Client config not found: ${clientConfigPath}\n`);
    process.exit(1);
}

// ─── Load client config ────────────────────────────────────────────────────────

let client;
try {
    const raw = fs.readFileSync(clientConfigPath, 'utf8');
    client = JSON.parse(raw);
} catch (err) {
    console.error(`\n❌  Failed to parse client config: ${err.message}\n`);
    process.exit(1);
}

console.log(`\n🚀  Deploying client: ${client.businessName ?? client.clientName}`);
console.log(`    Config : ${clientConfigPath}`);
console.log(`    Root   : ${ROOT}\n`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Creates a timestamped backup of a file.
 * @param {string} filePath - Absolute path to the file.
 * @returns {{ ok: boolean, backupPath: string|null, error: string|null }}
 */
function backupFile(filePath) {
    const backupPath = `${filePath}.backup-${TIMESTAMP}`;
    try {
        fs.copyFileSync(filePath, backupPath);
        return { ok: true, backupPath, error: null };
    } catch (err) {
        return { ok: false, backupPath: null, error: err.message };
    }
}

/**
 * Reads, transforms, and writes a file.
 * @param {string} filePath  - Absolute path.
 * @param {function(string): string} transformFn - Receives file content, returns new content.
 * @returns {{ ok: boolean, changed: boolean, error: string|null }}
 */
function patchFile(filePath, transformFn) {
    try {
        const original = fs.readFileSync(filePath, 'utf8');
        const patched = transformFn(original);
        const changed = patched !== original;
        if (changed) {
            fs.writeFileSync(filePath, patched, 'utf8');
        }
        return { ok: true, changed, error: null };
    } catch (err) {
        return { ok: false, changed: false, error: err.message };
    }
}

/**
 * Prints a result row to stdout.
 * @param {string} label
 * @param {{ ok: boolean, changed?: boolean, backupPath?: string|null, error?: string|null }} result
 */
function printResult(label, result) {
    if (!result.ok) {
        console.error(`  ❌  ${label}`);
        console.error(`       Reason: ${result.error}`);
    } else {
        const changed = result.changed === false ? ' (no changes needed)' : '';
        const backup = result.backupPath ? `\n       Backup : ${path.relative(ROOT, result.backupPath)}` : '';
        console.log(`  ✅  ${label}${changed}${backup}`);
    }
}

// ─── Track overall success ─────────────────────────────────────────────────────

let allOk = true;

function fail() { allOk = false; }

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 1 — app.json
// ═══════════════════════════════════════════════════════════════════════════════

console.log('── Patching app.json ─────────────────────────────────────────────────────');

const appJsonBkp = backupFile(TARGET_FILES.appJson);
printResult('app.json → backup', appJsonBkp);
if (!appJsonBkp.ok) fail();

if (appJsonBkp.ok) {
    const appJsonResult = patchFile(TARGET_FILES.appJson, (content) => {
        let obj;
        try {
            obj = JSON.parse(content);
        } catch (e) {
            throw new Error(`JSON parse failed: ${e.message}`);
        }

        const expo = obj.expo;

        // ── Top-level metadata ──────────────────────────────────────────────────
        if (client.businessName) {
            expo.name = client.businessName;
            expo.slug = client.clientName ?? expo.slug;
        }

        // ── iOS bundle identifier ───────────────────────────────────────────────
        if (client.ios?.bundleIdentifier) {
            expo.ios = expo.ios ?? {};
            expo.ios.bundleIdentifier = client.ios.bundleIdentifier;
        }

        // ── Android package name ────────────────────────────────────────────────
        if (client.android?.package) {
            expo.android = expo.android ?? {};
            expo.android.package = client.android.package;
        }

        // ── extra block ─────────────────────────────────────────────────────────
        expo.extra = expo.extra ?? {};

        if (client.shopifyStoreUrl) {
            expo.extra.shopifyStoreUrl = client.shopifyStoreUrl;
        }
        if (client.primaryColor) {
            expo.extra.primaryColor = client.primaryColor;
        }
        if (client.secondaryColor) {
            expo.extra.secondaryColor = client.secondaryColor;
        }

        // ── Firebase ─────────────────────────────────────────────────────────────
        if (client.firebase && typeof client.firebase === 'object') {
            expo.extra.firebase = {
                ...(expo.extra.firebase ?? {}),
                ...client.firebase,
            };
        }

        // ── EAS ──────────────────────────────────────────────────────────────────
        if (client.eas?.projectId) {
            expo.extra.eas = expo.extra.eas ?? {};
            expo.extra.eas.projectId = client.eas.projectId;
        }

        // ── Splash / adaptive icon background colour ──────────────────────────
        if (client.primaryColor) {
            if (expo.splash) expo.splash.backgroundColor = client.primaryColor;
            if (expo.android?.adaptiveIcon) expo.android.adaptiveIcon.backgroundColor = client.primaryColor;
        }

        return JSON.stringify(obj, null, 2) + '\n';
    });

    printResult('app.json → patch', { ...appJsonResult, backupPath: appJsonBkp.backupPath });
    if (!appJsonResult.ok) fail();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 2 — App.js
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n── Patching App.js ───────────────────────────────────────────────────────');

const appJsBkp = backupFile(TARGET_FILES.appJs);
printResult('App.js → backup', appJsBkp);
if (!appJsBkp.ok) fail();

if (appJsBkp.ok) {
    // App.js reads all config from Constants.expoConfig.extra at runtime,
    // so no text substitution is needed here. We back it up for safety and
    // report "no changes needed" — this keeps the pipeline honest.
    const appJsResult = patchFile(TARGET_FILES.appJs, (content) => {
        let out = content;

        // If a future version adds a hardcoded fallback colour, patch it:
        if (client.primaryColor) {
            out = out.replace(
                /(TAB_ACTIVE_COLOR\s*=\s*extra\.primaryColor\s*\?\?\s*')[^']+(')/g,
                `$1${client.primaryColor}$2`
            );
        }

        return out;
    });

    printResult('App.js → patch', { ...appJsResult, backupPath: appJsBkp.backupPath });
    if (!appJsResult.ok) fail();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 3 — src/utils/notifications.js
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n── Patching src/utils/notifications.js ──────────────────────────────────');

const notifBkp = backupFile(TARGET_FILES.notifications);
printResult('notifications.js → backup', notifBkp);
if (!notifBkp.ok) fail();

if (notifBkp.ok) {
    // notifications.js also reads all config from Constants.expoConfig.extra at
    // runtime. The only string literal that can become client-specific is the
    // fallback lightColor on the Android notification channel.
    const notifResult = patchFile(TARGET_FILES.notifications, (content) => {
        let out = content;

        if (client.primaryColor) {
            // Patch the Android channel lightColor fallback string
            out = out.replace(
                /(lightColor:\s*extra\.primaryColor\s*\?\?\s*')[^']+(')/g,
                `$1${client.primaryColor}$2`
            );
        }

        return out;
    });

    printResult('notifications.js → patch', { ...notifResult, backupPath: notifBkp.backupPath });
    if (!notifResult.ok) fail();
}

// ─── Final summary ─────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────────────────────────────────');
if (allOk) {
    console.log(`✅  Deployment patch complete for "${client.businessName ?? client.clientName}".`);
    console.log('    Next step: run  eas build --platform all  to kick off the EAS build.\n');
    process.exit(0);
} else {
    console.error(`❌  Deployment patch finished with errors. Review output above.\n`);
    process.exit(1);
}
