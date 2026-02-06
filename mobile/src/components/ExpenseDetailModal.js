import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';
import { normalizeCategory, getCategoryColor } from '../constants/categories';
import CategoryIcon from './CategoryIcon';
import CurrencyDisplay from './CurrencyDisplay';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;

export default function ExpenseDetailModal({ visible, expense, onClose, onEdit, onDelete }) {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { getCurrencyInfo } = useCurrency();

    const translateY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => {
                // Only respond to downward swipes
                return gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
            },
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    translateY.setValue(gesture.dy);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.5) {
                    // Swipe far enough or fast enough → dismiss
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        onClose();
                        setTimeout(() => translateY.setValue(0), 100);
                    });
                } else {
                    // Snap back
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 8,
                    }).start();
                }
            },
        })
    ).current;

    if (!expense) return null;

    const category = normalizeCategory(expense.category);
    const categoryColor = getCategoryColor(category);
    const isSubscription = expense.description?.includes('(Subscription)');

    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        return date.toLocaleDateString(locale, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (dateTimeString) => {
        if (!dateTimeString) return '—';
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = () => {
        Alert.alert(t('confirm'), t('deleteConfirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('delete'),
                style: 'destructive',
                onPress: () => {
                    onDelete(expense.id);
                    onClose();
                },
            },
        ]);
    };

    // Opacity fades as user swipes down
    const overlayOpacity = translateY.interpolate({
        inputRange: [0, SCREEN_HEIGHT * 0.4],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const styles = createStyles(colors, categoryColor);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.container,
                    { transform: [{ translateY }] },
                ]}
                {...panResponder.panHandlers}
            >
                {/* Handle bar — visual cue for swipe */}
                <View style={styles.handleBar} />

                {/* Category icon header */}
                <View style={styles.iconHeader}>
                    <View style={styles.bigIcon}>
                        <CategoryIcon category={category} size={36} color="#FFF" />
                    </View>
                    {isSubscription && (
                        <View style={styles.subscriptionBadge}>
                            <Text style={styles.subscriptionBadgeText}>🔄 {t('subscriptions')}</Text>
                        </View>
                    )}
                </View>

                {/* Description */}
                <Text style={styles.description}>
                    {expense.description?.replace(' (Subscription)', '')}
                </Text>

                {/* Amount */}
                <CurrencyDisplay
                    amountInEUR={expense.amount}
                    originalCurrency={expense.currency}
                    style={styles.amount}
                />

                {/* Details grid */}
                <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>📁 {t('category')}</Text>
                        <Text style={styles.detailValue}>{t(`categories.${category}`)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>📅 {language === 'pt' ? 'Data' : 'Date'}</Text>
                        <Text style={styles.detailValue}>{formatFullDate(expense.date)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>🕐 {language === 'pt' ? 'Adicionado' : 'Added'}</Text>
                        <Text style={styles.detailValue}>{formatTime(expense.createdAt)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>💱 {t('currency')}</Text>
                        <Text style={styles.detailValue}>
                            {getCurrencyInfo().flag} {expense.currency || 'EUR'} — {getCurrencyInfo().symbol}{parseFloat(expense.amount).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                            onClose();
                            setTimeout(() => onEdit(expense), 300);
                        }}
                    >
                        <Text style={styles.editButtonIcon}>✏️</Text>
                        <Text style={styles.editButtonText}>{t('editExpense')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Text style={styles.deleteButtonIcon}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const createStyles = (colors, categoryColor) => StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    overlayTouch: {
        flex: 1,
    },
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxxl,
        borderTopRightRadius: borderRadius.xxxl,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl + 10,
        alignItems: 'center',
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    iconHeader: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    bigIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: categoryColor,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.large,
    },
    subscriptionBadge: {
        marginTop: spacing.sm,
        backgroundColor: colors.primaryBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.xl,
    },
    subscriptionBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },
    description: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        fontSize: fontSize.giant,
        fontWeight: fontWeight.bold,
        color: colors.primary,
        marginBottom: spacing.xl,
    },
    detailsCard: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    detailLabel: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    detailValue: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        textAlign: 'right',
        flex: 1,
        marginLeft: spacing.md,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.colored,
    },
    editButtonIcon: {
        fontSize: fontSize.lg,
    },
    editButtonText: {
        color: colors.textWhite,
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
    },
    deleteButton: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
    },
    deleteButtonIcon: {
        fontSize: fontSize.xl,
    },
});