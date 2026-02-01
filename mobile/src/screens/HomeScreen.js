import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
} from 'react-native';

import { PieChart } from 'react-native-chart-kit';

import { expenseService } from '../services/api';
import ExpenseCard from '../components/ExpenseCard';
import CategoryLegend from '../components/CategoryLegend';
import AddExpenseModal from '../components/AddExpenseModal';

import { CATEGORY_COLORS, normalizeCategory } from '../constants/categories';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows, sizes } from '../constants/theme';
import { filterByThisMonth, filterByLast30Days, filterByAll } from '../utils/helpers';
import { useLanguage } from '../contexts/LanguageContext';

export default function HomeScreen() {
    // Estados
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState(null);

    // Idioma
    const { language, changeLanguage, t } = useLanguage();

    // Filtro
    const [filter, setFilter] = useState('all'); // 'all', 'thisMonth', 'last30Days'

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
        return expenses.filter((exp) => normalizeCategory(exp.category) === selectedCategory);
    };

    const getCategoryTotal = (category) => {
        return filteredExpenses
            .filter((exp) => normalizeCategory(exp.category) === category)
            .reduce((sum, exp) => sum + exp.amount, 0);
    };

    // Função: Aplicar filtro
    const getFilteredExpenses = () => {
        switch (filter) {
            case 'thisMonth':
                return filterByThisMonth(expenses);
            case 'last30Days':
                return filterByLast30Days(expenses);
            default:
                return filterByAll(expenses);
        }
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

    const handleEditExpense = (expense) => {
        setExpenseToEdit(expense);
        setShowAddModal(true);
        setShowCategoryModal(false);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setExpenseToEdit(null);
    };

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
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>💰 {t('appName')}</Text>

                    {/* Seletor de idioma */}
                    <TouchableOpacity
                        style={styles.languageSelector}
                        onPress={() => changeLanguage(language === 'pt' ? 'en' : 'pt')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.languageFlag}>
                            {language === 'pt' ? '🇵🇹' : '🇬🇧'}
                        </Text>
                        <Text style={styles.languageCode}>
                            {language.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.headerStats}>
                    <View>
                        <Text style={styles.headerLabel}>{t('total')}</Text>
                        <Text style={styles.headerAmount}>€{filteredTotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View>
                        <Text style={styles.headerLabel}>{t('expenses')}</Text>
                        <Text style={styles.headerCount}>{filteredExpenses.length}</Text>
                    </View>
                </View>
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
                                {filter === 'thisMonth' ? t('noExpensesThisMonth') : t('noExpensesLast30Days')}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {t('tryAnotherPeriod')}
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

                        {/* Legendas */}
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
                                            onPress={() => handleEditExpense(item)}
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
                                                            setShowCategoryModal(false);
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

const styles = StyleSheet.create({
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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.textWhite,
    },
    languageSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
    },
    languageFlag: {
        fontSize: fontSize.lg,
        marginRight: spacing.xs,
    },
    languageCode: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.textWhite,
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
        fontWeight: fontWeight.light,
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
});