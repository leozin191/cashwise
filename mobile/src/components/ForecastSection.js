import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencyByCode } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import { calculateForecast } from '../utils/helpers';
import currencyService from '../services/currency';

export default function ForecastSection({ expenses, subscriptions }) {
    const { colors } = useTheme();
    const { language, t } = useLanguage();
    const { currency } = useCurrency();
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [forecastData, setForecastData] = useState([]);

    useEffect(() => {
        const convertData = async () => {
            const forecast = calculateForecast(expenses, subscriptions, language);
            const converted = await Promise.all(
                forecast.map(async (m) => ({
                    ...m,
                    subscriptionsConverted: await currencyService.convert(m.subscriptionsTotal, currency),
                    installmentsConverted: await currencyService.convert(m.installmentsTotal, currency),
                    combinedConverted: await currencyService.convert(m.combinedTotal, currency),
                }))
            );
            setForecastData(converted);
        };
        convertData();
    }, [expenses, subscriptions, currency, language]);

    const styles = createStyles(colors);
    const currencySymbol = getCurrencyByCode(currency).symbol;

    if (forecastData.length === 0) return null;

    const selected = forecastData[selectedMonth];
    const hasData = selected && selected.combinedConverted > 0;

    return (
        <View style={styles.container}>
            {/* Title */}
            <View style={styles.titleRow}>
                <Ionicons name="telescope-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                <Text style={styles.title}>{t('forecast')}</Text>
                <Text style={styles.subtitle}>{t('forecastSubtitle')}</Text>
            </View>

            {/* Month Tabs */}
            <View style={styles.tabsRow}>
                {forecastData.map((month, index) => (
                    <TouchableOpacity
                        key={month.key}
                        style={[styles.tab, selectedMonth === index && styles.tabActive]}
                        onPress={() => setSelectedMonth(index)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabLabel, selectedMonth === index && styles.tabLabelActive]}>
                            {month.label}
                        </Text>
                        <Text style={[styles.tabAmount, selectedMonth === index && styles.tabAmountActive]}>
                            {currencySymbol}{month.combinedConverted?.toFixed(0) || '0'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Detail */}
            {hasData ? (
                <View style={styles.detailContainer}>
                    {/* Subscriptions row */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                            <View style={[styles.detailIconCircle, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="repeat-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.detailLabel}>{t('subscriptionsTotal')}</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {currencySymbol}{selected.subscriptionsConverted.toFixed(2)}
                        </Text>
                    </View>

                    {/* Installments row */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                            <View style={[styles.detailIconCircle, { backgroundColor: colors.warning + '20' }]}>
                                <Ionicons name="card-outline" size={16} color={colors.warning} />
                            </View>
                            <Text style={styles.detailLabel}>{t('installmentsTotal')}</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {currencySymbol}{selected.installmentsConverted.toFixed(2)}
                        </Text>
                    </View>

                    {/* Separator */}
                    <View style={styles.separator} />

                    {/* Total row */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                            <View style={[styles.detailIconCircle, { backgroundColor: colors.success + '20' }]}>
                                <Ionicons name="wallet-outline" size={16} color={colors.success} />
                            </View>
                            <Text style={styles.totalLabel}>{t('forecastTotal')}</Text>
                        </View>
                        <Text style={styles.totalValue}>
                            {currencySymbol}{selected.combinedConverted.toFixed(2)}
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
                    <Text style={styles.emptyText}>{t('noUpcomingCosts')}</Text>
                    <Text style={styles.emptySubtext}>{t('noUpcomingCostsHint')}</Text>
                </View>
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        margin: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        ...shadows.small,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    subtitle: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginLeft: spacing.sm,
    },
    tabsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tabLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.textLight,
        textTransform: 'capitalize',
    },
    tabLabelActive: {
        color: colors.textWhite,
    },
    tabAmount: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
        marginTop: 2,
    },
    tabAmountActive: {
        color: colors.textWhite,
    },
    detailContainer: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    detailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIconCircle: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    detailLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
    },
    detailValue: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    totalLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    totalValue: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginTop: spacing.sm,
    },
    emptySubtext: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginTop: spacing.xs,
    },
});
