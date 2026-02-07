import { View, Text, StyleSheet } from 'react-native';
import { normalizeCategory } from '../constants/categories';
import { formatDate } from '../utils/helpers';
import { spacing, fontSize, fontFamily, borderRadius } from '../constants/theme';
import CurrencyDisplay from './CurrencyDisplay';
import { getCurrencyByCode } from '../constants/currencies';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import CategoryIcon from './CategoryIcon';

export default function ExpenseCard({ expense }) {
    const { currency } = useCurrency();
    const { colors } = useTheme();
    const { language } = useLanguage();
    const styles = createStyles(colors);

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
                        {expense.description}
                    </Text>
                    <Text style={styles.date}>
                        {formatDate(expense.date, language)}
                    </Text>
                </View>
            </View>
            <View>
                <CurrencyDisplay
                    amountInEUR={expense.amount}
                    originalCurrency={expense.currency}
                    style={styles.amount}
                />
                {expense.currency && expense.currency !== currency && (
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
        marginVertical: spacing.md - 2,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    amount: {
        fontSize: fontSize.lg + 1,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    originalAmount: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginTop: spacing.xs,
    },
});