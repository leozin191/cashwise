import { useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import CurrencyDisplay from './CurrencyDisplay';
import IncomeCard from './IncomeCard';
import { createStyles } from '../screens/homeStyles';

export default function HomeIncomeSection({
    filteredIncomes,
    incomeTotal,
    incomePeriodFilter,
    setIncomePeriodFilter,
    incomeSearchQuery,
    setIncomeSearchQuery,
    incomeCategoryFilter,
    setIncomeCategoryFilter,
    incomeCategories,
    showAllIncomes,
    setShowAllIncomes,
    onDetailIncome,
}) {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const hasMoreIncomes = filteredIncomes.length > 5;
    const incomesToShow = showAllIncomes ? filteredIncomes : filteredIncomes.slice(0, 5);

    return (
        <View style={styles.incomeSection}>
            <View style={styles.incomeHeader}>
                <View style={styles.incomeTitleRow}>
                    <Ionicons name="cash-outline" size={18} color={colors.success} style={{ marginRight: spacing.sm }} />
                    <View>
                        <Text style={styles.incomeTitle}>{t('income')}</Text>
                        <Text style={styles.incomeSubtitle}>{t(incomePeriodFilter)}</Text>
                    </View>
                </View>
                <CurrencyDisplay
                    amountInEUR={incomeTotal}
                    style={styles.incomeTotal}
                />
            </View>

            <View style={styles.incomeFilters}>
                <View style={styles.incomePeriodRow}>
                    {['thisMonth', 'last30Days', 'all'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.incomePeriodChip,
                                incomePeriodFilter === period && styles.incomePeriodChipActive,
                            ]}
                            onPress={() => setIncomePeriodFilter(period)}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[
                                    styles.incomePeriodText,
                                    incomePeriodFilter === period && styles.incomePeriodTextActive,
                                ]}
                            >
                                {t(period)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.incomeSearch}>
                    <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                    <TextInput
                        style={styles.incomeSearchInput}
                        placeholder={t('searchIncomes')}
                        placeholderTextColor={colors.textLight}
                        value={incomeSearchQuery}
                        onChangeText={setIncomeSearchQuery}
                        returnKeyType="search"
                    />
                    {incomeSearchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setIncomeSearchQuery('')}
                            style={styles.incomeClearButton}
                        >
                            <Ionicons name="close-circle" size={18} color={colors.textLight} />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.incomeCategoryRow}>
                        <TouchableOpacity
                            style={[
                                styles.incomeCategoryChip,
                                incomeCategoryFilter === 'all' && styles.incomeCategoryChipActive,
                            ]}
                            onPress={() => setIncomeCategoryFilter('all')}
                        >
                            <Text
                                style={[
                                    styles.incomeCategoryText,
                                    incomeCategoryFilter === 'all' && styles.incomeCategoryTextActive,
                                ]}
                            >
                                {t('all')}
                            </Text>
                        </TouchableOpacity>
                        {incomeCategories.map((category) => (
                            <TouchableOpacity
                                key={category}
                                style={[
                                    styles.incomeCategoryChip,
                                    incomeCategoryFilter === category && styles.incomeCategoryChipActive,
                                ]}
                                onPress={() => setIncomeCategoryFilter(category)}
                            >
                                <Text
                                    style={[
                                        styles.incomeCategoryText,
                                        incomeCategoryFilter === category && styles.incomeCategoryTextActive,
                                    ]}
                                >
                                    {t(`categories.${category}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

                        {filteredIncomes.length === 0 ? (
                <View style={styles.incomeEmpty}>
                    <Text style={styles.incomeEmptyText}>{t('noIncomes')}</Text>
                </View>
            ) : (
                <View style={styles.incomeList}>
                    {incomesToShow.map((income) => (
                        <IncomeCard
                            key={income.id}
                            income={income}
                            onPress={() => onDetailIncome(income)}
                        />
                    ))}
                </View>
            )}

            {hasMoreIncomes && (
                <TouchableOpacity
                    style={styles.incomeToggle}
                    onPress={() => setShowAllIncomes(!showAllIncomes)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.incomeToggleText}>
                        {showAllIncomes ? t('showLess') : t('viewAll')}
                    </Text>
                    <Ionicons
                        name={showAllIncomes ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textLight}
                        style={{ marginLeft: spacing.xs }}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}
