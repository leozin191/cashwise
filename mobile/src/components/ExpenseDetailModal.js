import { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import { normalizeCategory, getCategoryColor } from '../constants/categories';
import CategoryIcon from './CategoryIcon';
import CurrencyDisplay from './CurrencyDisplay';
import { getCurrencyByCode } from '../constants/currencies';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;

export default function ExpenseDetailModal({ visible, expense, onClose, onEdit, onDelete, onViewInstallments }) {
    const { colors } = useTheme();
    const { t, language } = useLanguage();

    const translateY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => {
                return gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
            },
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    translateY.setValue(gesture.dy);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.5) {
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        onClose();
                        setTimeout(() => translateY.setValue(0), 100);
                    });
                } else {
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
    const expenseCurrency = getCurrencyByCode(expense.currency || 'EUR');

    const installmentMatch = expense.description?.match(/\((\d+)\/(\d+)\)$/);
    const isInstallment = !!installmentMatch;

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
                <View style={styles.handleBar} />

                <View style={styles.iconHeader}>
                    <View style={styles.bigIcon}>
                        <CategoryIcon category={category} size={36} color={colors.textWhite} />
                    </View>
                    {isSubscription && (
                        <View style={styles.subscriptionBadge}>
                            <Ionicons name="repeat" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.subscriptionBadgeText}>{t('subscriptions')}</Text>
                        </View>
                    )}
                    {isInstallment && (
                        <View style={styles.installmentBadge}>
                            <Ionicons name="card-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.installmentBadgeText}>
                                {t('installmentOf')} {installmentMatch[1]}/{installmentMatch[2]}
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={styles.description}>
                    {expense.description?.replace(' (Subscription)', '').replace(/\s*\(\d+\/\d+\)$/, '')}
                </Text>

                <CurrencyDisplay
                    amountInEUR={expense.amount}
                    originalCurrency={expense.currency}
                    style={styles.amount}
                />

                <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="folder-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('category')}</Text>
                        </View>
                        <Text style={styles.detailValue}>{t(`categories.${category}`)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="calendar-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('date')}</Text>
                        </View>
                        <Text style={styles.detailValue}>{formatFullDate(expense.date)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="time-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('added')}</Text>
                        </View>
                        <Text style={styles.detailValue}>{formatTime(expense.createdAt)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="swap-horizontal-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('currency')}</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {expenseCurrency.flag} {expense.currency || 'EUR'} — {expenseCurrency.symbol}{parseFloat(expense.amount).toFixed(2)}
                        </Text>
                    </View>

                    {isInstallment && (
                        <>
                            <View style={styles.separator} />
                            <View style={styles.detailRow}>
                                <View style={styles.detailLabelRow}>
                                    <Ionicons name="card-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                                    <Text style={styles.detailLabel}>{t('installment')}</Text>
                                </View>
                                <Text style={styles.detailValue}>
                                    {installmentMatch[1]} / {installmentMatch[2]} — {t('totalValue')}: {expenseCurrency.symbol}{(parseFloat(expense.amount) * parseInt(installmentMatch[2])).toFixed(2)}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {isInstallment && onViewInstallments && (
                    <TouchableOpacity
                        style={styles.installmentsButton}
                        onPress={() => onViewInstallments(expense)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="list-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.installmentsButtonText}>{t('viewInstallments')}</Text>
                    </TouchableOpacity>
                )}

                {(onEdit || onDelete) && (
                    <View style={styles.actionButtons}>
                        {onEdit && (
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => onEdit(expense)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="create-outline" size={20} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.editButtonText}>{t('edit')}</Text>
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => onDelete(expense)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="trash-outline" size={20} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.deleteButtonText}>{t('delete')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

            </Animated.View>
        </Modal>
    );
}

const createStyles = (colors, categoryColor) => StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    subscriptionBadgeText: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.semibold,
        color: colors.primary,
    },
    installmentBadge: {
        marginTop: spacing.sm,
        backgroundColor: colors.primaryBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.xl,
        flexDirection: 'row',
        alignItems: 'center',
    },
    installmentBadgeText: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.semibold,
        color: colors.primary,
    },
    description: {
        fontSize: fontSize.xxl,
        fontFamily: fontFamily.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        fontSize: fontSize.giant,
        fontFamily: fontFamily.bold,
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
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    detailValue: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        textAlign: 'right',
        flex: 1,
        marginLeft: spacing.md,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
    actionButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: spacing.md,
    },
    installmentsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: colors.primaryBg,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
    },
    installmentsButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.primary,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    editButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.textWhite,
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    deleteButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.textWhite,
    },
});
