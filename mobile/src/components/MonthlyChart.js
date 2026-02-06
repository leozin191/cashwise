import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencyByCode } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';
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

        // Calcula estatísticas
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
                <Text style={[styles.title, { color: colors.text }]}>
                    📈 {t('monthlyEvolution')}
                </Text>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyEmoji]}>📊</Text>
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
            <Text style={[styles.title, { color: colors.text }]}>
                📈 {t('monthlyEvolution')}
            </Text>

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
    title: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        marginBottom: spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontSize: fontSize.sm,
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
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
    },
});