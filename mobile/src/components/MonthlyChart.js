import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencyByCode } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import { groupByMonth, getLastNMonths } from '../utils/helpers';
import { useState, useEffect, useRef } from 'react';
import currencyService from '../services/currency';

const screenWidth = Dimensions.get('window').width;

export default function MonthlyChart({ expenses, onMonthPress, selectedMonthKey }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { currency } = useCurrency();
    const [chartData, setChartData] = useState(null);
    const [stats, setStats] = useState({ highest: 0, lowest: 0, average: 0 });
    const [trendData, setTrendData] = useState(null);
    const [activeBar, setActiveBar] = useState(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        let isActive = true;
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const run = async () => {
            if (!expenses || expenses.length === 0) {
                if (!isActive || requestIdRef.current !== requestId) return;
                setChartData(null);
                setTrendData(null);
                setStats({ highest: 0, lowest: 0, average: 0 });
                return;
            }

            const lastMonths = getLastNMonths(6);
            const rates = await currencyService.getRates();
            if (!isActive || requestIdRef.current !== requestId) return;

            const convertToEUR = (amount, fromCurrency) => {
                if (fromCurrency === 'EUR') return amount;
                const rate = rates && rates[fromCurrency];
                if (!rate) return amount;
                return amount / rate;
            };

            const rateTo = currency === 'EUR' ? 1 : (rates && rates[currency]) || null;

            const normalizedExpenses = expenses.map((exp) => {
                const amount = Number(exp.amount) || 0;
                const amountEUR = exp.currency && exp.currency !== 'EUR'
                    ? convertToEUR(amount, exp.currency)
                    : amount;
                return { ...exp, amount: amountEUR };
            });
            const grouped = groupByMonth(normalizedExpenses);

            const expenseCounts = {};
            normalizedExpenses.forEach((exp) => {
                const date = new Date(exp.date);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                expenseCounts[monthYear] = (expenseCounts[monthYear] || 0) + 1;
            });

            const data = lastMonths.map((month) => {
                const amountInEUR = grouped[month.key] || 0;
                return rateTo ? amountInEUR * rateTo : amountInEUR;
            });

            const nonZeroData = data.filter((v) => v > 0);
            const highest = nonZeroData.length > 0 ? Math.max(...nonZeroData) : 0;
            const lowest = nonZeroData.length > 0 ? Math.min(...nonZeroData) : 0;
            const average = nonZeroData.length > 0
                ? nonZeroData.reduce((a, b) => a + b, 0) / nonZeroData.length
                : 0;

            const currentMonthValue = data[5];
            const previousMonthValue = data[4];
            const nextTrend = (previousMonthValue > 0 && currentMonthValue > 0)
                ? {
                    percentage: Math.abs(((currentMonthValue - previousMonthValue) / previousMonthValue) * 100).toFixed(0),
                    isIncrease: currentMonthValue > previousMonthValue,
                }
                : null;

            const barData = lastMonths.map((m, i) => {
                const value = data[i];
                let frontColor;

                if (value === 0) {
                    frontColor = colors.border;
                } else if (value === highest && nonZeroData.length > 1) {
                    frontColor = colors.error;
                } else if (value > average) {
                    frontColor = colors.warning;
                } else {
                    frontColor = colors.success;
                }

                const isSelected = selectedMonthKey && selectedMonthKey === m.key;
                const finalColor = selectedMonthKey
                    ? (isSelected ? frontColor : `${frontColor}66`)
                    : frontColor;

                return {
                    value,
                    label: m.label,
                    frontColor: finalColor,
                    onPress: () => {
                        setActiveBar({
                            monthLabel: m.label,
                            monthKey: m.key,
                            value,
                            count: expenseCounts[m.key] || 0,
                        });
                        if (onMonthPress) {
                            onMonthPress(m.key);
                        }
                    },
                };
            });

            if (!isActive || requestIdRef.current !== requestId) return;
            setStats({ highest, lowest, average });
            setTrendData(nextTrend);
            setChartData(barData);
        };

        run();

        return () => {
            isActive = false;
        };
    }, [expenses, currency, colors, onMonthPress, selectedMonthKey]);

    const formatYAxisLabel = (label) => {
        const num = Number(label);
        if (num === 0) return '0';
        if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return num.toFixed(0);
    };

    const styles = createStyles(colors);
    const currencySymbol = getCurrencyByCode(currency).symbol;
    const chartWidth = screenWidth - 100;
    const barWidth = ((chartWidth - 60) / 6) * 0.6;
    const barSpacing = ((chartWidth - 60) / 6) * 0.4;

    if (!chartData || expenses.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <Ionicons name="bar-chart-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.title}>
                        {t('monthlyEvolution')}
                    </Text>
                </View>
                <View style={styles.emptyState}>
                    <Ionicons name="bar-chart-outline" size={48} color={colors.textLight} />
                    <Text style={styles.emptyText}>
                        {t('noDataYet')}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {t('addExpensesToSee')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                <Ionicons name="bar-chart-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                <Text style={styles.title}>
                    {t('monthlyEvolution')}
                </Text>
            </View>

            {trendData && (
                <View style={[
                    styles.trendBadge,
                    { backgroundColor: trendData.isIncrease ? colors.errorBg : colors.successBg },
                ]}>
                    <Ionicons
                        name={trendData.isIncrease ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={trendData.isIncrease ? colors.error : colors.success}
                    />
                    <Text style={[
                        styles.trendText,
                        { color: trendData.isIncrease ? colors.error : colors.success },
                    ]}>
                        {trendData.isIncrease ? '+' : '-'}{trendData.percentage}%
                    </Text>
                    <Text style={styles.trendLabel}>
                        {t('vsLastMonth')}
                    </Text>
                </View>
            )}

            <View style={styles.chartWrapper}>
                <BarChart
                    data={chartData}
                    width={chartWidth}
                    height={200}
                    barWidth={barWidth}
                    spacing={barSpacing}
                    initialSpacing={10}
                    endSpacing={10}
                    barBorderRadius={4}
                    noOfSections={4}
                    xAxisColor={colors.border}
                    yAxisColor={'transparent'}
                    xAxisLabelTextStyle={styles.axisLabel}
                    yAxisTextStyle={styles.axisLabel}
                    rulesType="dashed"
                    rulesColor={colors.border}
                    dashWidth={4}
                    dashGap={4}
                    isAnimated
                    animationDuration={600}
                    formatYLabel={formatYAxisLabel}
                />

                {activeBar && (
                    <TouchableWithoutFeedback onPress={() => setActiveBar(null)}>
                        <View style={styles.tooltipOverlay}>
                            <View style={styles.tooltip}>
                                <Text style={styles.tooltipTitle}>
                                    {activeBar.monthLabel.toUpperCase()}
                                </Text>
                                <Text style={styles.tooltipText}>
                                    {currencySymbol}{activeBar.value.toFixed(0)}
                                </Text>
                                <Text style={styles.tooltipSubtext}>
                                    {activeBar.count} {t('expenses').toLowerCase()}
                                </Text>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )}
            </View>

            <View style={styles.statsDivider} />
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                        {t('highestMonth')}
                    </Text>
                    <Text style={styles.statValue}>
                        {currencySymbol}{stats.highest.toFixed(0)}
                    </Text>
                </View>

                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                        {t('monthlyAverage')}
                    </Text>
                    <Text style={styles.statValue}>
                        {currencySymbol}{stats.average.toFixed(0)}
                    </Text>
                </View>

                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                        {t('lowestMonth')}
                    </Text>
                    <Text style={styles.statValue}>
                        {currencySymbol}{stats.lowest.toFixed(0)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        margin: spacing.xl,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        ...shadows.medium,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    trendText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.bold,
    },
    trendLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    chartWrapper: {
        marginVertical: spacing.md,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        textAlign: 'center',
    },
    axisLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    tooltipOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.overlayLight,
        borderRadius: borderRadius.md,
    },
    tooltip: {
        backgroundColor: colors.text,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        ...shadows.large,
    },
    tooltipTitle: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: colors.surface,
        letterSpacing: 1,
        marginBottom: spacing.xs,
    },
    tooltipText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.surface,
    },
    tooltipSubtext: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.surface,
        opacity: 0.7,
        marginTop: spacing.xs,
    },
    statsDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
        color: colors.primary,
    },
});
