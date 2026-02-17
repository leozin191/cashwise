import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/helpers';
import { spacing, fontSize, fontFamily, borderRadius } from '../constants/theme';
import CurrencyDisplay from './CurrencyDisplay';
import { getCurrencyByCode } from '../constants/currencies';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function IncomeCard({ income, onPress }) {
    const { currency } = useCurrency();
    const { colors } = useTheme();
    const { language } = useLanguage();
    const styles = createStyles(colors);

    const Wrapper = onPress ? TouchableOpacity : View;
    const wrapperProps = onPress ? { onPress, activeOpacity: 0.9 } : {};

    return (
        <Wrapper style={styles.card} {...wrapperProps}>
            <View style={styles.left}>
                <View style={styles.iconContainer}>
                    <Ionicons name="cash-outline" size={22} color={colors.success} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.description} numberOfLines={1}>
                        {income.description}
                    </Text>
                    <Text style={styles.date}>
                        {formatDate(income.date, language)}
                    </Text>
                </View>
            </View>
            <View style={styles.right}>
                <CurrencyDisplay
                    amountInEUR={income.amount}
                    originalCurrency={income.currency}
                    style={styles.amount}
                />
                {!!income.currency && income.currency !== currency && (
                    <Text style={styles.originalAmount}>
                        ({getCurrencyByCode(income.currency).symbol}{income.amount.toFixed(2)} {income.currency})
                    </Text>
                )}
            </View>
        </Wrapper>
    );
}

const createStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        marginVertical: spacing.sm,
        borderRadius: borderRadius.lg,
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
        width: 44,
        height: 44,
        borderRadius: borderRadius.full,
        backgroundColor: colors.successBg,
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
});
