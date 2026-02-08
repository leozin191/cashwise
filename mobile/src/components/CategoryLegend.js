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
            <View style={styles.topRow}>
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <CategoryIcon category={category} size={18} color={color} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{t(`categories.${category}`)}</Text>
                    <Text style={styles.percent}>{percentage}%</Text>
                </View>
                <CurrencyDisplay
                    amountInEUR={amount}
                    style={styles.amount}
                />
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors) => StyleSheet.create({
    item: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
        marginLeft: spacing.md,
    },
    name: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    percent: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginTop: 1,
    },
    amount: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    progressTrack: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
});
