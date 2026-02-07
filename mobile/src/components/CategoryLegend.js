import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCategoryColor } from '../constants/categories';
import { calculatePercentage } from '../utils/helpers';
import { spacing, borderRadius, fontSize, fontFamily } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import CurrencyDisplay from './CurrencyDisplay';
import CategoryIcon from './CategoryIcon';

export default function CategoryLegend({ category, amount, total, onPress }) {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const percentage = calculatePercentage(amount, total);
    const color = getCategoryColor(category);
    const styles = createStyles(colors);

    return (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.left}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <CategoryIcon category={category} size={20} color={color} />
                <Text style={styles.name}>{t(`categories.${category}`)}</Text>
            </View>
            <View style={styles.right}>
                <CurrencyDisplay
                    amountInEUR={amount}
                    style={styles.amount}
                />
                <Text style={styles.percent}>{percentage}%</Text>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors) => StyleSheet.create({
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
        gap: spacing.sm,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: borderRadius.full,
    },
    name: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
        marginBottom: 2,
    },
    percent: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
});