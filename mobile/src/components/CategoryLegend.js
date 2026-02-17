import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCategoryColor } from '../constants/categories';
import { calculatePercentage } from '../utils/helpers';
import { spacing, borderRadius, fontSize, fontFamily } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import CurrencyDisplay from './CurrencyDisplay';
import CategoryIcon from './CategoryIcon';

export default function CategoryLegend({ category, amount, total, onPress, originalCurrency }) {
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
                <View style={styles.leftRow}>
                    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                        <CategoryIcon category={category} size={16} color={color} />
                    </View>
                    <Text style={styles.name} numberOfLines={1}>
                        {t(`categories.${category}`)}
                    </Text>
                </View>
                <View style={styles.rightRow}>
                    <CurrencyDisplay
                        amountInEUR={amount}
                        originalCurrency={originalCurrency}
                        style={styles.amount}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    />
                    <Text style={styles.percent}>{percentage}%</Text>
                </View>
            </View>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors) => StyleSheet.create({
    item: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    leftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    name: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    rightRow: {
        alignItems: 'flex-end',
        marginLeft: spacing.sm,
    },
    percent: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
        marginTop: 2,
    },
    amount: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    progressTrack: {
        height: 3,
        backgroundColor: colors.border,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
});
