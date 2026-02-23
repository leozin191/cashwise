import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeCategory } from '../constants/categories';
import { formatDate } from '../utils/helpers';
import { spacing, fontSize, fontFamily, borderRadius, shadows } from '../constants/theme';
import CurrencyDisplay from './CurrencyDisplay';
import { getCurrencyByCode } from '../constants/currencies';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import CategoryIcon from './CategoryIcon';

export default function ExpenseCard({ expense }) {
    const { currency } = useCurrency();
    const { colors } = useTheme();
    const { language } = useLanguage();
    const { user } = useAuth();
    const styles = createStyles(colors);

    const isOtherMember = expense.addedByUsername && expense.addedByUsername !== user?.username;

    const installmentMatch = expense.description?.match(/\((\d+)\/(\d+)\)$/);
    const isInstallment = !!installmentMatch;
    const displayDescription = isInstallment
        ? expense.description.replace(/\s*\(\d+\/\d+\)$/, '')
        : expense.description;

    return (
        <View style={styles.card}>
            <View style={styles.left}>
                <View style={styles.iconContainer}>
                    <CategoryIcon
                        category={normalizeCategory(expense.category)}
                        size={28}
                        color={colors.primary}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.description} numberOfLines={1}>
                        {displayDescription}
                    </Text>
                    <Text style={styles.date}>
                        {formatDate(expense.date, language)}
                    </Text>
                    {isOtherMember && (
                        <View style={styles.addedByRow}>
                            <View style={styles.addedByAvatar}>
                                <Text style={styles.addedByAvatarText}>
                                    {expense.addedByName?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                            </View>
                            <Text style={styles.addedByText}>@{expense.addedByUsername}</Text>
                        </View>
                    )}
                    {isInstallment && (
                        <View style={styles.installmentBadge}>
                            <Ionicons name="card-outline" size={10} color={colors.primary} />
                            <Text style={styles.installmentBadgeText}>
                                {installmentMatch[1]}/{installmentMatch[2]}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.right}>
                <CurrencyDisplay
                    amountInEUR={expense.amount}
                    originalCurrency={expense.currency}
                    style={styles.amount}
                />
                {!!expense.currency && expense.currency !== currency && (
                    <Text style={styles.originalAmount}>
                        ({getCurrencyByCode(expense.currency).symbol}{expense.amount.toFixed(2)} {expense.currency})
                    </Text>
                )}
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        marginVertical: spacing.xs,
        marginHorizontal: spacing.xl,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...shadows.small,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textContainer: {
        flex: 1,
        marginRight: spacing.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primaryBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    description: {
        fontSize: fontSize.base - 1,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    date: {
        fontSize: fontSize.xs + 1,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    right: {
        flexShrink: 0,
        alignItems: 'flex-end',
        maxWidth: '35%',
    },
    amount: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    originalAmount: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginTop: spacing.xs,
    },
    installmentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryBg,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginTop: spacing.xs,
        alignSelf: 'flex-start',
        gap: 3,
    },
    installmentBadgeText: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.semibold,
        color: colors.primary,
    },
    addedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
        gap: 4,
    },
    addedByAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addedByAvatarText: {
        fontSize: 9,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    addedByText: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
});
