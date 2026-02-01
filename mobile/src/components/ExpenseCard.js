import { View, Text, StyleSheet } from 'react-native';
import { getCategoryEmoji, normalizeCategory } from '../constants/categories';
import { formatDate, formatCurrency } from '../utils/helpers';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

export default function ExpenseCard({ expense }) {
    return (
        <View style={styles.card}>
            <View style={styles.left}>
                <Text style={styles.emoji}>
                    {getCategoryEmoji(normalizeCategory(expense.category))}
                </Text>
                <View>
                    <Text style={styles.description}>
                        {expense.description}
                    </Text>
                    <Text style={styles.date}>
                        {formatDate(expense.date)}
                    </Text>
                </View>
            </View>
            <Text style={styles.amount}>
                {formatCurrency(expense.amount)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        marginHorizontal: spacing.xl,
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
    emoji: {
        fontSize: fontSize.xxxl - 2,
        marginRight: spacing.md,
    },
    description: {
        fontSize: fontSize.base - 1,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    date: {
        fontSize: fontSize.xs + 1,
        color: colors.textLight,
    },
    amount: {
        fontSize: fontSize.lg + 1,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
});