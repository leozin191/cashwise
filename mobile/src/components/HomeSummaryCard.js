import { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import CurrencyDisplay from './CurrencyDisplay';
import { createStyles } from '../screens/homeStyles';

export default function HomeSummaryCard({ monthlySummary, summaryLoading, totalsByCurrencyLabel }) {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const balanceTone = monthlySummary.balanceEUR < 0 ? colors.error : colors.success;

    return (
        <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.summaryTitle}>{t('monthlySummary')}</Text>
                </View>
                {summaryLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            <View style={styles.summaryGrid}>
                <View style={[styles.summaryTile, { backgroundColor: `${balanceTone}14` }]}>
                    <View style={[styles.summaryTileIcon, { backgroundColor: `${balanceTone}26` }]}>
                        <Ionicons name="wallet-outline" size={16} color={balanceTone} />
                    </View>
                    <Text style={styles.summaryTileLabel}>{t('balance')}</Text>
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.balanceEUR}
                        style={[styles.summaryTileValue, { color: balanceTone }]}
                    />
                </View>

                <View style={[styles.summaryTile, { backgroundColor: `${colors.warning}14` }]}>
                    <View style={[styles.summaryTileIcon, { backgroundColor: `${colors.warning}26` }]}>
                        <Ionicons name="trending-down-outline" size={16} color={colors.warning} />
                    </View>
                    <Text style={styles.summaryTileLabel}>{t('expenses')}</Text>
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.spentEUR}
                        style={styles.summaryTileValue}
                    />
                </View>

                <View style={[styles.summaryTile, { backgroundColor: `${colors.primary}14` }]}>
                    <View style={[styles.summaryTileIcon, { backgroundColor: `${colors.primary}26` }]}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.summaryTileLabel}>{t('forecastedSpending')}</Text>
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.forecastEUR}
                        style={styles.summaryTileValue}
                    />
                </View>
            </View>

            {monthlySummary.budgetTotalEUR !== null && (
                <View style={styles.summaryBudgetRow}>
                    <Text style={styles.summaryBudgetLabel}>{t('budgetRemaining')}</Text>
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.budgetRemainingEUR}
                        style={[
                            styles.summaryBudgetValue,
                            monthlySummary.budgetRemainingEUR < 0 && styles.summaryBudgetValueNegative,
                        ]}
                    />
                    <Text style={styles.summaryBudgetDivider}>/</Text>
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.budgetTotalEUR}
                        style={styles.summaryBudgetValueMuted}
                    />
                </View>
            )}
            {totalsByCurrencyLabel ? (
                <Text style={styles.summaryTotalsText}>
                    {t('totalsByCurrency')}: {totalsByCurrencyLabel}
                </Text>
            ) : null}
        </View>
    );
}
