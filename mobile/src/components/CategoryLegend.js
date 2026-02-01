import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCategoryEmoji, getCategoryColor } from '../constants/categories';
import { formatCurrency, calculatePercentage } from '../utils/helpers';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

export default function CategoryLegend({
                                           category,
                                           amount,
                                           total,
                                           onPress
                                       }) {
    const { t } = useLanguage();
    const percentage = calculatePercentage(amount, total);
    const color = getCategoryColor(category);

    return (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.left}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <Text style={styles.emoji}>{getCategoryEmoji(category)}</Text>
                <Text style={styles.name}>{t(`categories.${category}`)}</Text>
            </View>
            <View style={styles.right}>
                <Text style={styles.amount}>{formatCurrency(amount)}</Text>
                <Text style={styles.percent}>{percentage}%</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: borderRadius.full,
        marginRight: spacing.sm,
    },
    emoji: {
        fontSize: fontSize.xl + 2,
        marginRight: spacing.sm,
    },
    name: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: 2,
    },
    percent: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
});