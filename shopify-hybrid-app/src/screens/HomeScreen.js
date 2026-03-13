import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// ─── White-label config ───────────────────────────────────────────────────────
// BUG-9 FIX: Store URL is sourced from app.json → expo.extra.shopifyStoreUrl
// so it is never hardcoded in source. Falls back to a placeholder that will
// render a clear error rather than silently loading the wrong store.
const extra = Constants.expoConfig?.extra ?? {};
const SHOPIFY_STORE_URL =
  extra.shopifyStoreUrl && extra.shopifyStoreUrl !== 'https://your-store.myshopify.com'
    ? extra.shopifyStoreUrl
    : null; // null triggers the config-error screen below

// ─── JS Injection ─────────────────────────────────────────────────────────────
// Runs before content loads (injectedJavaScriptBeforeContentLoaded) to prevent
// any layout flicker. Also re-injected via injectJavaScript() on load end as
// a fallback for dynamically rendered storefronts.
//
// BUG-11 FIX: Removed `maximum-scale=1.0` and `user-scalable=no` from the
// viewport meta tag. Apple App Store review guidelines (§4.2) and WCAG 2.1
// SC 1.4.4 prohibit suppressing pinch-to-zoom. iOS 10+ ignores these attributes
// anyway, so removing them has no visible effect on layout.
const hideShopifyUI = `
  (function() {
    const style = document.createElement('style');
    style.innerHTML = \`
      #shopify-section-header,
      #shopify-section-footer,
      #shopify-section-announcement-bar,
      header, footer,
      .site-header, .site-footer,
      .mobile-nav-wrapper,
      .chat-app-wrapper {
        display: none !important;
      }
      body {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        margin: 0 !important;
      }
    \`;
    document.head.appendChild(style);

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
    document.getElementsByTagName('head')[0].appendChild(meta);
  })();
  true;
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const webviewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  // BUG-7 FIX: Track WebView load errors to show a native retry UI.
  const [webError, setWebError] = useState(null);

  // Guard: if the store URL was never configured, show a clear config error
  // instead of loading a broken placeholder URL.
  if (!SHOPIFY_STORE_URL) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Store not configured</Text>
          <Text style={styles.errorBody}>
            Set <Text style={styles.code}>expo.extra.shopifyStoreUrl</Text> in{' '}
            <Text style={styles.code}>app.json</Text> and rebuild.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Android hardware back button — navigate within WebView if possible
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true; // event consumed
      }
      return false; // let the OS handle it (exit app / go to prev screen)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  // Re-inject on load end as a fallback for JS-rendered storefronts
  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setWebError(null);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(hideShopifyUI);
    }
  }, []);

  // BUG-7 FIX: onError / onHttpError handlers — show friendly retry UI instead
  // of the native browser error page.
  const handleError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[HomeScreen] WebView error:', nativeEvent);
    setIsLoading(false);
    setWebError(nativeEvent.description || 'Could not load the store. Please check your connection.');
  }, []);

  const handleRetry = useCallback(() => {
    setWebError(null);
    setIsLoading(true);
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* BUG-7 FIX: Native error screen with retry button */}
      {webError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorBody}>{webError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <WebView
            ref={webviewRef}
            source={{ uri: SHOPIFY_STORE_URL }}
            style={styles.webview}
            // Primary injection — fires before DOM content loads, prevents flicker
            injectedJavaScriptBeforeContentLoaded={hideShopifyUI}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsBackForwardNavigationGestures={true}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleError}
            onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
          />

          {isLoading && (
            <View style={styles.loaderOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#5B6EF5" />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  // Error / config warning
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#F0F0F0',
    color: '#CC0000',
  },
  retryButton: {
    backgroundColor: '#5B6EF5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
