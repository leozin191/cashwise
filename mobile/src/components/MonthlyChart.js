import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencyByCode } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import { groupByMonth, getLastNMonths } from '../utils/helpers';
import { useState, useEffect } from 'react';
import currencyService from '../services/currency';

const screenWidth = Dimensions.get('window').width;

export default function MonthlyChart({ expenses }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { currency } = useCurrency();
    const [chartData, setChartData] = useState(null);
    const [stats, setStats] = useState({ highest: 0, lowest: 0, average: 0 });

    useEffect(() => {
        processData();
    }, [expenses, currency]);

    const processData = async () => {
        if (!expenses || expenses.length === 0) {
            setChartData(null);
            return;
        }

        const lastMonths = getLastNMonths(6);
        const grouped = groupByMonth(expenses);

        const data = await Promise.all(
            lastMonths.map(async (month) => {
                const amountInEUR = grouped[month.key] || 0;
                const converted = await currencyService.convert(amountInEUR, currency);
                return converted;
            })
        );

        const labels = lastMonths.map((m) => m.label);

        const nonZeroData = data.filter(v => v > 0);
        if (nonZeroData.length > 0) {
            setStats({
                highest: Math.max(...nonZeroData),
                lowest: Math.min(...nonZeroData),
                average: nonZeroData.reduce((a, b) => a + b, 0) / nonZeroData.length,
            });
        }

        setChartData({
            labels,
            datasets: [{
                data: data.length > 0 ? data : [0],
            }],
        });
    };

    if (!chartData || expenses.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <View style={styles.titleRow}>
                    <Ionicons name="trending-up-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('monthlyEvolution')}
                    </Text>
                </View>
                <View style={styles.emptyState}>
                    <Ionicons name="bar-chart-outline" size={48} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>
                        {t('noDataYet')}
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                        {t('addExpensesToSee')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.titleRow}>
                <Ionicons name="trending-up-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                <Text style={[styles.title, { color: colors.text }]}>
                    {t('monthlyEvolution')}
                </Text>
            </View>

            <LineChart
                data={chartData}
                width={screenWidth - 60}
                height={220}
                chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.primary,
                    labelColor: (opacity = 1) => colors.textLight,
                    style: {
                        borderRadius: borderRadius.lg,
                    },
                    propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: colors.primary,
                        fill: colors.surface,
                    },
                }}
                bezier
                style={{
                    marginVertical: spacing.md,
                    borderRadius: borderRadius.lg,
                }}
            />

            {/* Estatísticas */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        {t('highestMonth')}
                    </Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                        {getCurrencyByCode(currency).symbol}{stats.highest.toFixed(0)}
                    </Text>
                </View>

                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        {t('monthlyAverage')}
                    </Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                        {getCurrencyByCode(currency).symbol}{stats.average.toFixed(0)}
                    </Text>
                </View>

                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        {t('lowestMonth')}
                    </Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                        {getCurrencyByCode(currency).symbol}{stats.lowest.toFixed(0)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: spacing.xl,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
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
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.semibold,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: spacing.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
    },
});
