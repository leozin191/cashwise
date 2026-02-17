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
import CurrencyDisplay from './CurrencyDisplay';
import { getCurrencyByCode } from '../constants/currencies';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;

export default function IncomeDetailModal({ visible, income, onClose, onEdit, onDelete }) {
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

    if (!income) return null;

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
        if (!dateTimeString) return '-';
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

    const incomeCurrency = getCurrencyByCode(income.currency || 'EUR');
    const styles = createStyles(colors);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            <Animated.View
                style={[styles.container, { transform: [{ translateY }] }]}
                {...panResponder.panHandlers}
            >
                <View style={styles.handleBar} />

                <View style={styles.iconHeader}>
                    <View style={styles.bigIcon}>
                        <Ionicons name="cash-outline" size={32} color={colors.textWhite} />
                    </View>
                    <View style={styles.entryBadge}>
                        <Ionicons name="arrow-down-outline" size={12} color={colors.success} style={{ marginRight: 4 }} />
                        <Text style={styles.entryBadgeText}>{t('incomeEntry')}</Text>
                    </View>
                </View>

                <Text style={styles.description}>{income.description}</Text>

                <CurrencyDisplay
                    amountInEUR={income.amount}
                    originalCurrency={income.currency}
                    style={styles.amount}
                />

                <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="folder-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('category')}</Text>
                        </View>
                        <Text style={styles.detailValue}>{t('incomeEntry')}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="calendar-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('date')}</Text>
                        </View>
                        <Text style={styles.detailValue}>{formatFullDate(income.date)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="time-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('added')}</Text>
                        </View>
                        <Text style={styles.detailValue}>{formatTime(income.createdAt)}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailLabelRow}>
                            <Ionicons name="swap-horizontal-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.detailLabel}>{t('currency')}</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {incomeCurrency.flag} {income.currency || 'EUR'} - {incomeCurrency.symbol}{parseFloat(income.amount).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {(onEdit || onDelete) && (
                    <View style={styles.actionButtons}>
                        {onEdit && (
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => onEdit(income)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="create-outline" size={20} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.editButtonText}>{t('edit')}</Text>
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => onDelete(income)}
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

const createStyles = (colors) => StyleSheet.create({
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
        paddingBottom: spacing.xl,
        paddingTop: spacing.md,
        ...shadows.large,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    iconHeader: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    bigIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    entryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.successBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    entryBadgeText: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.semibold,
        color: colors.success,
    },
    description: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        fontSize: fontSize.giant,
        fontFamily: fontFamily.bold,
        color: colors.success,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    detailsCard: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
    },
    detailValue: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    separator: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    editButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.primary,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    editButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.textWhite,
    },
    deleteButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.error,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    deleteButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.textWhite,
    },
});
