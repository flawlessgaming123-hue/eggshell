import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    registerForPushNotificationsAsync,
    saveNotification,
    markNotificationRead,
    clearAllNotifications,
    INBOX_STORAGE_KEY,
} from '../utils/notifications';

// BUG-12 FIX: setNotificationHandler has been moved to App.js (root level) so it is
// active regardless of which tab the user is on. It must NOT be set here.

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── NotificationCard ──────────────────────────────────────────────────────────
function NotificationCard({ item, onPress }) {
    return (
        <TouchableOpacity
            style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}
            onPress={() => onPress(item.id)}
            activeOpacity={0.7}
        >
            {!item.read && <View style={styles.unreadDot} />}
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text
                        style={[styles.cardTitle, item.read ? styles.textRead : styles.textUnread]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text style={styles.cardTime}>{formatTimestamp(item.timestamp)}</Text>
                </View>
                <Text style={styles.cardBody} numberOfLines={3}>
                    {item.body}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// ── InboxScreen ───────────────────────────────────────────────────────────────
export default function InboxScreen() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // BUG-5 FIX: Track registration/load errors so the UI can surface them.
    const [initError, setInitError] = useState(null);
    const listenerRef = useRef(null);

    // ── Load persisted notifications ─────────────────────────────────────────
    const loadNotifications = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
            setNotifications(raw ? JSON.parse(raw) : []);
        } catch (err) {
            console.error('[InboxScreen] Failed to load notifications:', err);
        }
    }, []);

    // ── Mount: register device + load inbox + start foreground listener ───────
    useEffect(() => {
        // BUG-5 FIX: Async IIFE wrapped in try/catch/finally so setLoading(false)
        // is always called, even if registration or storage throws.
        (async () => {
            try {
                await registerForPushNotificationsAsync();
                await loadNotifications();
            } catch (err) {
                console.error('[InboxScreen] Initialisation error:', err);
                setInitError('Could not initialise notifications. Please restart the app.');
            } finally {
                setLoading(false);
            }
        })();

        // Foreground FCM listener — saves to storage and prepends to local state.
        // BUG-6 FIX: async listener callback wrapped in try/catch to prevent
        // unhandled promise rejections crashing the app on RN 0.73+.
        listenerRef.current = Notifications.addNotificationReceivedListener(async notification => {
            try {
                await saveNotification(notification);
                const raw = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
                setNotifications(raw ? JSON.parse(raw) : []);
            } catch (err) {
                console.error('[InboxScreen] Failed to handle incoming notification:', err);
            }
        });

        return () => {
            if (listenerRef.current) {
                Notifications.removeNotificationSubscription(listenerRef.current);
            }
        };
    }, [loadNotifications]);

    // ── Pull-to-refresh ───────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    }, [loadNotifications]);

    // ── Mark a notification as read ───────────────────────────────────────────
    const handlePress = useCallback(async (id) => {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    // ── Clear all ─────────────────────────────────────────────────────────────
    const handleClearAll = useCallback(async () => {
        await clearAllNotifications();
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#008060" />
                </View>
            </SafeAreaView>
        );
    }

    // BUG-5 FIX: Surface initialisation errors with a clear message.
    if (initError) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorSubtitle}>{initError}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Inbox</Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {notifications.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>Clear all</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>All caught up</Text>
                    <Text style={styles.emptySubtitle}>
                        You'll see order updates and promotions here once they arrive.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <NotificationCard item={item} onPress={handlePress} />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#008060"
                            colors={['#008060']}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SHOPIFY_GREEN = '#008060';

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Error state
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 60,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#CC0000',
        marginBottom: 8,
    },
    errorSubtitle: {
        fontSize: 14,
        color: '#555555',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.3,
    },
    badge: {
        backgroundColor: SHOPIFY_GREEN,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    clearBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    clearBtnText: {
        color: SHOPIFY_GREEN,
        fontSize: 14,
        fontWeight: '600',
    },

    // List
    list: {
        padding: 16,
        paddingBottom: 32,
    },

    // Card
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 10,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#E8E8E8',
        // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    cardUnread: {
        borderLeftWidth: 3,
        borderLeftColor: SHOPIFY_GREEN,
    },
    cardRead: {
        opacity: 0.65,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SHOPIFY_GREEN,
        marginTop: 5,
        marginRight: 10,
        flexShrink: 0,
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    textUnread: {
        fontWeight: '700',
        color: '#1A1A1A',
    },
    textRead: {
        fontWeight: '500',
        color: '#555555',
    },
    cardTime: {
        fontSize: 12,
        color: '#999999',
        flexShrink: 0,
    },
    cardBody: {
        fontSize: 13,
        color: '#4A4A4A',
        lineHeight: 19,
    },

    // Empty state
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888888',
        textAlign: 'center',
        lineHeight: 20,
    },
});
