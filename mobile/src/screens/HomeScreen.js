import React, { useState, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
} from 'react-native';

import { PieChart } from 'react-native-chart-kit';

import { expenseService } from '../services/api';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import CategoryLegend from '../components/CategoryLegend';
import AddExpenseModal from '../components/AddExpenseModal';

import { CATEGORY_COLORS, normalizeCategory } from '../constants/categories';
import { getCurrencyByCode } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontWeight, shadows, sizes } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import CurrencyDisplay from '../components/CurrencyDisplay';
import MonthlyChart from '../components/MonthlyChart';
import FadeIn from '../components/FadeIn';
import { filterByThisMonth, filterByLast30Days, filterByAll, sortByNewest, sortByOldest, sortByHighest, sortByLowest, getHighestExpense, getAveragePerDay, getTopCategory } from '../utils/helpers';

export default function HomeScreen() {
    // Estados
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [detailExpense, setDetailExpense] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState(null);

    // Idioma
    const { language, changeLanguage, t } = useLanguage();

    // Tema
    const { colors } = useTheme();

    // Moeda
    const { currency, getCurrencyInfo } = useCurrency();

    // Filtro
    const [filter, setFilter] = useState('thisMonth');

    // Busca
    const [searchQuery, setSearchQuery] = useState('');

    // Ordenação
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
    const [showSortMenu, setShowSortMenu] = useState(false);

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await expenseService.getAll();
            setExpenses(data);
        } catch (error) {
            Alert.alert(t('error'), t('couldNotLoad'));
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadExpenses();
    };

    const handleDeleteExpense = async (id) => {
        try {
            await expenseService.delete(id);
            loadExpenses();
            Alert.alert(`✅ ${t('deleted')}`, t('expenseDeleted'));
        } catch (error) {
            Alert.alert(t('error'), t('couldNotDelete'));
        }
    };

    const handleCategoryPress = (category) => {
        setSelectedCategory(category);
        setShowCategoryModal(true);
    };

    const getCategoryExpenses = () => {
        const filtered = filteredExpenses.filter((exp) => normalizeCategory(exp.category) === selectedCategory);
        return applySorting(filtered);
    };

    // Função: Aplicar ordenação
    const applySorting = (expensesToSort) => {
        switch (sortBy) {
            case 'oldest':
                return sortByOldest(expensesToSort);
            case 'highest':
                return sortByHighest(expensesToSort);
            case 'lowest':
                return sortByLowest(expensesToSort);
            default: // 'newest'
                return sortByNewest(expensesToSort);
        }
    };

    const getCategoryTotal = (category) => {
        return filteredExpenses
            .filter((exp) => normalizeCategory(exp.category) === category)
            .reduce((sum, exp) => sum + exp.amount, 0);
    };

    // Função: Aplicar filtro de data
    const getDateFilteredExpenses = () => {
        switch (filter) {
            case 'thisMonth':
                return filterByThisMonth(expenses);
            case 'last30Days':
                return filterByLast30Days(expenses);
            default:
                return filterByAll(expenses);
        }
    };

    // Função: Aplicar busca
    const getSearchFilteredExpenses = (expensesToFilter) => {
        if (!searchQuery.trim()) {
            return expensesToFilter;
        }

        const query = searchQuery.toLowerCase().trim();
        return expensesToFilter.filter(exp =>
            exp.description.toLowerCase().includes(query)
        );
    };

    // Função: Aplicar ambos os filtros
    const getFilteredExpenses = () => {
        const dateFiltered = getDateFilteredExpenses();
        return getSearchFilteredExpenses(dateFiltered);
    };

    // Despesas filtradas para usar no gráfico e cálculos
    const filteredExpenses = getFilteredExpenses();
    const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Recalcula chartData com despesas filtradas
    const filteredGrouped = filteredExpenses.reduce((acc, exp) => {
        const category = normalizeCategory(exp.category);
        if (!acc[category]) acc[category] = 0;
        acc[category] += exp.amount;
        return acc;
    }, {});

    const filteredChartData = Object.entries(filteredGrouped).map(([name, value]) => ({
        name,
        population: value,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
        legendFontColor: colors.text,
        legendFontSize: 0,
    }));

    // Estatísticas
    const highestExpense = getHighestExpense(filteredExpenses);
    const averagePerDay = getAveragePerDay(filteredExpenses);
    const topCategory = getTopCategory(filteredExpenses);

    const handleEditExpense = (expense) => {
        setExpenseToEdit(expense);
        setShowAddModal(true);
        setShowCategoryModal(false);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setExpenseToEdit(null);
    };

    const styles = createStyles(colors);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>{t('loading')} ⏳</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💰 {t('appName')}</Text>

                <View style={styles.headerStats}>
                    <View>
                        <Text style={styles.headerLabel}>{t('total')}</Text>
                        <CurrencyDisplay
                            amountInEUR={filteredTotal}
                            style={styles.headerAmount}
                        />
                    </View>
                    <View style={styles.divider} />
                    <View>
                        <Text style={styles.headerLabel}>{t('expenses')}</Text>
                        <Text style={styles.headerCount}>{filteredExpenses.length}</Text>
                    </View>
                </View>
            </View>
            {/* Campo de Busca */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('searchExpenses')}
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.clearButton}
                    >
                        <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Conteúdo */}
            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {expenses.length === 0 ? (
                    // Realmente vazio (sem despesas no banco)
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyText}>{t('noExpenses')}</Text>
                        <Text style={styles.emptySubtext}>{t('noExpensesSubtext')}</Text>
                    </View>
                ) : filteredExpenses.length === 0 ? (
                    // Tem despesas, mas filtro não encontrou nada
                    <View style={styles.chartSection}>
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🔍</Text>
                            <Text style={styles.emptyText}>
                                {searchQuery.trim()
                                    ? t('noResultsFound')
                                    : filter === 'thisMonth'
                                        ? t('noExpensesThisMonth')
                                        : t('noExpensesLast30Days')
                                }
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery.trim()
                                    ? t('noResultsFoundSubtext')
                                    : t('tryAnotherPeriod')
                                }
                            </Text>
                        </View>

                        {/* Filtros - mesmo quando vazio */}
                        <View style={styles.filtersContainerMain}>
                            <TouchableOpacity
                                style={[styles.filterButtonMain, filter === 'thisMonth' && styles.filterButtonMainActive]}
                                onPress={() => setFilter('thisMonth')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterButtonMainText, filter === 'thisMonth' && styles.filterButtonMainTextActive]}>
                                    {t('thisMonth')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterButtonMain, filter === 'last30Days' && styles.filterButtonMainActive]}
                                onPress={() => setFilter('last30Days')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterButtonMainText, filter === 'last30Days' && styles.filterButtonMainTextActive]}>
                                    {t('last30Days')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterButtonMain, filter === 'all' && styles.filterButtonMainActive]}
                                onPress={() => setFilter('all')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterButtonMainText, filter === 'all' && styles.filterButtonMainTextActive]}>
                                    {t('all')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.chartSection}>
                        {/* Gráfico */}
                        {filteredChartData.length > 0 && (
                            <FadeIn delay={100}>
                                <View style={styles.chartContainer}>
                                    <Text style={styles.chartTitle}>📊 {t('chartTitle')}</Text>
                                <View style={styles.pieWrapper}>
                                    <PieChart
                                        data={filteredChartData}
                                        width={320}
                                        height={200}
                                        chartConfig={{
                                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                        }}
                                        accessor="population"
                                        backgroundColor="transparent"
                                        paddingLeft="80"
                                        center={[0, 0]}
                                        absolute
                                        hasLegend={false}
                                    />
                                </View>
                            </View>
                            </FadeIn>
                        )}

                        {/* Filtros */}
                        <View style={styles.filtersContainerMain}>
                            <TouchableOpacity
                                style={[styles.filterButtonMain, filter === 'thisMonth' && styles.filterButtonMainActive]}
                                onPress={() => setFilter('thisMonth')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterButtonMainText, filter === 'thisMonth' && styles.filterButtonMainTextActive]}>
                                    {t('thisMonth')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterButtonMain, filter === 'last30Days' && styles.filterButtonMainActive]}
                                onPress={() => setFilter('last30Days')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterButtonMainText, filter === 'last30Days' && styles.filterButtonMainTextActive]}>
                                    {t('last30Days')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterButtonMain, filter === 'all' && styles.filterButtonMainActive]}
                                onPress={() => setFilter('all')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterButtonMainText, filter === 'all' && styles.filterButtonMainTextActive]}>
                                    {t('all')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Estatísticas */}
                        {/* Estatísticas */}
                        <FadeIn delay={300}>
                            <View style={styles.statsContainer}>
                            <Text style={styles.statsTitle}>📊 {t('statistics')}</Text>

                            <View style={styles.statsGrid}>
                                {/* Maior gasto */}
                                {highestExpense && (
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>{t('highestExpense')}</Text>
                                        <CurrencyDisplay
                                            amountInEUR={highestExpense.amount}
                                            originalCurrency={highestExpense.currency}
                                            style={styles.statValue}
                                        />
                                        <Text style={styles.statSubtext}>
                                            {highestExpense.description}
                                            {highestExpense.currency && highestExpense.currency !== currency && (
                                                ` (${getCurrencyByCode(highestExpense.currency).symbol}${highestExpense.amount.toFixed(2)} ${highestExpense.currency})`
                                            )}
                                        </Text>
                                    </View>
                                )}

                                {/* Média por dia */}
                                <View style={styles.statCard}>
                                    <Text style={styles.statLabel}>{t('averagePerDay')}</Text>
                                    <CurrencyDisplay
                                        amountInEUR={averagePerDay}
                                        style={styles.statValue}
                                    />
                                    <Text style={styles.statSubtext}>
                                        {filteredExpenses.length} {t('expenses').toLowerCase()}
                                    </Text>
                                </View>

                                {/* Categoria top */}
                                {topCategory && (
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>{t('topCategory')}</Text>
                                        <Text style={styles.statValue}>
                                            {t(`categories.${normalizeCategory(topCategory.name)}`)}
                                        </Text>
                                        <View style={{ flexDirection: 'row' }}>
                                            <Text style={styles.statSubtext}>
                                                {topCategory.percentage}% •
                                            </Text>
                                            <CurrencyDisplay
                                                amountInEUR={topCategory.amount}
                                                style={styles.statSubtext}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                            </View>
                        </FadeIn>

                        {/* Gráfico de Evolução Mensal */}
                        <FadeIn delay={500}>
                            <MonthlyChart expenses={expenses} />
                        </FadeIn>

                        {/* Legendas */}
                        <FadeIn delay={700}>
                            <View style={styles.legendsContainer}>
                            <Text style={styles.legendsTitle}>💡 {t('tapToSeeDetails')}</Text>

                            {filteredChartData
                                .slice()
                                .sort((a, b) => b.population - a.population)
                                .map((item, index) => (
                                    <CategoryLegend
                                        key={index}
                                        category={item.name}
                                        amount={item.population}
                                        total={filteredTotal}
                                        onPress={() => handleCategoryPress(item.name)}
                                    />
                                ))}
                            </View>
                        </FadeIn>
                    </View>
                )}
            </ScrollView>

            {/* Modal de Categoria */}
            <Modal
                visible={showCategoryModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.categoryModal}>
                        <View style={styles.categoryModalHeader}>
                            <Text style={styles.categoryModalTitle}>
                                {selectedCategory ? t(`categories.${selectedCategory}`) : ''}
                            </Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Menu de Ordenação */}
                        {getCategoryExpenses().length > 0 && (
                            <View style={styles.sortContainer}>
                                <Text style={styles.sortLabel}>{t('sortBy')}:</Text>
                                <TouchableOpacity
                                    style={styles.sortButton}
                                    onPress={() => setShowSortMenu(!showSortMenu)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.sortButtonText}>
                                        {t(sortBy)} ▼
                                    </Text>
                                </TouchableOpacity>

                                {/* Dropdown de opções */}
                                {showSortMenu && (
                                    <View style={styles.sortDropdown}>
                                        {['newest', 'oldest', 'highest', 'lowest'].map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[
                                                    styles.sortOption,
                                                    sortBy === option && styles.sortOptionActive
                                                ]}
                                                onPress={() => {
                                                    setSortBy(option);
                                                    setShowSortMenu(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.sortOptionText,
                                                    sortBy === option && styles.sortOptionTextActive
                                                ]}>
                                                    {t(option)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {getCategoryExpenses().length === 0 ? (
                            <View style={styles.emptyCategory}>
                                <Text style={styles.emptyCategoryText}>{t('noExpenses')}</Text>
                            </View>
                        ) : (
                            <ScrollView>
                                {getCategoryExpenses().map((item) => (
                                    <View key={item.id} style={styles.expenseItemContainer}>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setShowCategoryModal(false);
                                                setTimeout(() => setDetailExpense(item), 300);
                                            }}
                                            style={styles.expenseCardTouchable}
                                        >
                                            <ExpenseCard expense={item} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteButtonVisible}
                                            onPress={() => {
                                                Alert.alert(t('confirm'), t('deleteConfirm'), [
                                                    { text: t('cancel'), style: 'cancel' },
                                                    {
                                                        text: t('delete'),
                                                        style: 'destructive',
                                                        onPress: () => {
                                                            handleDeleteExpense(item.id);
                                                        },
                                                    },
                                                ]);
                                            }}
                                        >
                                            <Text style={styles.deleteIcon}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal de Detalhes */}
            <ExpenseDetailModal
                visible={!!detailExpense}
                expense={detailExpense}
                onClose={() => setDetailExpense(null)}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
            />

            {/* Modal de Adicionar/Editar */}
            <AddExpenseModal
                visible={showAddModal}
                onClose={handleCloseModal}
                onSuccess={loadExpenses}
                expenseToEdit={expenseToEdit}
            />

            {/* Botão + */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        paddingTop: sizes.headerHeight,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
    },
    headerTitle: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.textWhite,
        marginBottom: spacing.lg,
    },
    headerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: colors.primaryBg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    headerLabel: {
        fontSize: fontSize.xs,
        color: '#E0E7FF',
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerAmount: {
        fontSize: fontSize.huge,
        fontWeight: fontWeight.bold,
        color: colors.textWhite,
    },
    headerCount: {
        fontSize: fontSize.huge,
        fontWeight: fontWeight.bold,
        color: colors.textWhite,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    content: {
        flex: 1,
    },
    loadingText: {
        fontSize: fontSize.xl,
        color: colors.textLight,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    emptyText: {
        fontSize: fontSize.xl + 2,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        fontSize: fontSize.md,
        color: colors.textLight,
        textAlign: 'center',
    },
    chartSection: {
        paddingBottom: 100,
    },
    chartContainer: {
        backgroundColor: colors.surface,
        margin: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        ...shadows.medium,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.lg,
    },
    pieWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendsContainer: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xl,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.medium,
    },
    legendsTitle: {
        fontSize: fontSize.sm,
        color: colors.textLight,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    categoryModal: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxxl,
        borderTopRightRadius: borderRadius.xxxl,
        maxHeight: '80%',
        paddingBottom: spacing.xl,
    },
    categoryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    categoryModalTitle: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    closeButton: {
        fontSize: fontSize.huge,
        color: colors.textLight,
        fontWeight: fontWeight.light,
    },
    emptyCategory: {
        padding: 40,
        alignItems: 'center',
    },
    emptyCategoryText: {
        fontSize: fontSize.lg,
        color: colors.textLight,
    },
    expenseItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.xl,
        marginVertical: spacing.xs + 2,
    },
    expenseCardTouchable: {
        flex: 1,
    },
    deleteButtonVisible: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    deleteIcon: {
        fontSize: fontSize.xxl + 4,
    },
    fab: {
        position: 'absolute',
        bottom: spacing.xxl,
        right: spacing.xxl,
        width: sizes.fabSize,
        height: sizes.fabSize,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.colored,
    },
    fabIcon: {
        color: colors.textWhite,
        fontSize: fontSize.giant,
        fontWeight: '300',
        lineHeight: fontSize.giant,
        textAlign: 'center',
        marginTop: 1,
    },
    filtersContainerMain: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    filterButtonMain: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterButtonMainActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterButtonMainText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.textLight,
    },
    filterButtonMainTextActive: {
        color: colors.textWhite,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xl,
        marginTop: -spacing.xxl,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.medium,
    },
    searchIcon: {
        fontSize: fontSize.xl,
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
        padding: 0,
    },
    clearButton: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
    },
    clearButtonText: {
        fontSize: fontSize.xl,
        color: colors.textLight,
        fontWeight: fontWeight.light,
    },
    sortContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sortLabel: {
        fontSize: fontSize.sm,
        color: colors.textLight,
        fontWeight: fontWeight.medium,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortButtonText: {
        fontSize: fontSize.sm,
        color: colors.text,
        fontWeight: fontWeight.semibold,
    },
    sortDropdown: {
        position: 'absolute',
        top: 50,
        right: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.large,
        zIndex: 1000,
        minWidth: 150,
    },
    sortOption: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    sortOptionActive: {
        backgroundColor: colors.primaryBg,
    },
    sortOptionText: {
        fontSize: fontSize.sm,
        color: colors.text,
        fontWeight: fontWeight.medium,
    },
    sortOptionTextActive: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
    },
    statsContainer: {
        backgroundColor: colors.surface,
        margin: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.medium,
    },
    statsTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.lg,
    },
    statsGrid: {
        gap: spacing.md,
    },
    statCard: {
        backgroundColor: colors.background,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    statLabel: {
        fontSize: fontSize.xs,
        color: colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    statSubtext: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
});