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
    ActivityIndicator,
} from 'react-native';

import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { SwipeListView } from 'react-native-swipe-list-view';

import { expenseService } from '../services/api';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import CategoryLegend from '../components/CategoryLegend';
import AddExpenseModal from '../components/AddExpenseModal';

import { CATEGORY_COLORS, normalizeCategory } from '../constants/categories';
import { getCurrencyByCode } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows, sizes } from '../constants/theme';
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
            Alert.alert(t('deleted'), t('expenseDeleted'));
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
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerTitleRow}>
                    <Ionicons name="wallet-outline" size={24} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.headerTitle}>{t('appName')}</Text>
                </View>

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
            </LinearGradient>
            {/* Campo de Busca */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
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
                        <Ionicons name="close-circle" size={20} color={colors.textLight} />
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
                        <Ionicons name="mail-open-outline" size={64} color={colors.textLight} />
                        <Text style={styles.emptyText}>{t('noExpenses')}</Text>
                        <Text style={styles.emptySubtext}>{t('noExpensesSubtext')}</Text>
                    </View>
                ) : filteredExpenses.length === 0 ? (
                    // Tem despesas, mas filtro não encontrou nada
                    <View style={styles.chartSection}>
                        <View style={styles.emptyState}>
                            <Ionicons name="search-outline" size={64} color={colors.textLight} />
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
                                    <View style={styles.chartTitleRow}>
                                        <Ionicons name="pie-chart-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                                        <Text style={styles.chartTitle}>{t('chartTitle')}</Text>
                                    </View>
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
                        <FadeIn delay={300}>
                            <View style={styles.statsContainer}>
                            <View style={styles.statsTitleRow}>
                                <Ionicons name="stats-chart-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.statsTitle}>{t('statistics')}</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                {/* Maior gasto */}
                                {highestExpense && (
                                    <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
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
                                <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
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
                                    <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
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
                            <View style={styles.legendsTitleRow}>
                                <Ionicons name="information-circle-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.xs }} />
                                <Text style={styles.legendsTitle}>{t('tapToSeeDetails')}</Text>
                            </View>

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
                            <SwipeListView
                                data={getCategoryExpenses()}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            setShowCategoryModal(false);
                                            setTimeout(() => setDetailExpense(item), 300);
                                        }}
                                        style={styles.swipeRow}
                                    >
                                        <ExpenseCard expense={item} />
                                    </TouchableOpacity>
                                )}
                                renderHiddenItem={({ item }) => (
                                    <View style={styles.swipeHiddenRow}>
                                        <TouchableOpacity
                                            style={styles.swipeEditButton}
                                            onPress={() => handleEditExpense(item)}
                                        >
                                            <Ionicons name="create-outline" size={24} color="#FFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.swipeDeleteButton}
                                            onPress={() => {
                                                Alert.alert(t('confirm'), t('deleteConfirm'), [
                                                    { text: t('cancel'), style: 'cancel' },
                                                    {
                                                        text: t('delete'),
                                                        style: 'destructive',
                                                        onPress: () => handleDeleteExpense(item.id),
                                                    },
                                                ]);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={24} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                leftOpenValue={70}
                                rightOpenValue={-70}
                                disableLeftSwipe={false}
                                disableRightSwipe={false}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal de Detalhes */}
            <ExpenseDetailModal
                visible={!!detailExpense}
                expense={detailExpense}
                onClose={() => setDetailExpense(null)}
            />

            {/* Modal de Adicionar/Editar */}
            <AddExpenseModal
                visible={showAddModal}
                onClose={handleCloseModal}
                onSuccess={loadExpenses}
                expenseToEdit={expenseToEdit}
            />

            {/* FAB */}
            <TouchableOpacity style={styles.fabWrapper} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
                <LinearGradient
                    colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}
                >
                    <Ionicons name="add" size={32} color={colors.textWhite} />
                </LinearGradient>
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
        gap: spacing.md,
    },
    header: {
        paddingTop: sizes.headerHeight,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: fontSize.xxxl,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    headerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    headerLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: '#E0E7FF',
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerAmount: {
        fontSize: fontSize.huge,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    headerCount: {
        fontSize: fontSize.huge,
        fontFamily: fontFamily.bold,
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
        fontSize: fontSize.lg,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyText: {
        fontSize: fontSize.xl + 2,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    emptySubtext: {
        fontSize: fontSize.md,
        fontFamily: fontFamily.regular,
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
    chartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: spacing.lg,
    },
    chartTitle: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
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
        ...shadows.small,
    },
    legendsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    legendsTitle: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
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
        fontFamily: fontFamily.bold,
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
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    swipeRow: {
        backgroundColor: colors.surface,
    },
    swipeHiddenRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: spacing.md - 2,
    },
    swipeEditButton: {
        backgroundColor: colors.primary,
        width: 70,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: borderRadius.md,
        borderBottomLeftRadius: borderRadius.md,
    },
    swipeDeleteButton: {
        backgroundColor: colors.error,
        width: 70,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: borderRadius.md,
        borderBottomRightRadius: borderRadius.md,
    },
    fabWrapper: {
        position: 'absolute',
        bottom: spacing.xxl,
        right: spacing.xxl,
        ...shadows.colored,
    },
    fab: {
        width: sizes.fabSize,
        height: sizes.fabSize,
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontFamily: fontFamily.semibold,
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
    searchInput: {
        flex: 1,
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        color: colors.text,
        padding: 0,
    },
    clearButton: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
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
        fontFamily: fontFamily.medium,
        color: colors.textLight,
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
        fontFamily: fontFamily.semibold,
        color: colors.text,
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
        fontFamily: fontFamily.medium,
        color: colors.text,
    },
    sortOptionTextActive: {
        color: colors.primary,
        fontFamily: fontFamily.bold,
    },
    statsContainer: {
        backgroundColor: colors.surface,
        margin: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.small,
    },
    statsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    statsTitle: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
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
        fontFamily: fontFamily.semibold,
        color: colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.xxl,
        fontFamily: fontFamily.bold,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    statSubtext: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
});
