import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    Dimensions,
} from 'react-native';

import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { SwipeListView } from 'react-native-swipe-list-view';
import { useFocusEffect } from '@react-navigation/native';

import { expenseService, subscriptionService } from '../services/api';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import CategoryLegend from '../components/CategoryLegend';
import AddExpenseModal from '../components/AddExpenseModal';

import { CATEGORY_COLORS, normalizeCategory } from '../constants/categories';

import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows, sizes } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import CurrencyDisplay from '../components/CurrencyDisplay';
import MonthlyChart from '../components/MonthlyChart';
import ForecastSection from '../components/ForecastSection';
import FadeIn from '../components/FadeIn';
import { formatDate, filterByThisMonth, filterByLast30Days, filterByAll, sortByNewest, sortByOldest, sortByHighest, sortByLowest, getHighestExpense, getAveragePerDay, getTopCategory } from '../utils/helpers';
import { useSnackbar } from '../contexts/SnackbarContext';
import InstallmentsModal from '../components/InstallmentsModal';
import InstallmentGroupsModal from '../components/InstallmentGroupsModal';
import DeleteConfirmSheet from '../components/DeleteConfirmSheet';
import { scheduleReminders } from '../utils/notifications';
import { getBudgets } from '../utils/budgets';
import currencyService from '../services/currency';
import { getCurrencyByCode } from '../constants/currencies';
import { runAutoBackupIfDue } from '../utils/backup';

export default function HomeScreen() {
    const [expenses, setExpenses] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [detailExpense, setDetailExpense] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState(null);
    const [installmentGroupToEdit, setInstallmentGroupToEdit] = useState(null);
    const [prefillExpense, setPrefillExpense] = useState(null);
    const [installmentsVisible, setInstallmentsVisible] = useState(false);
    const [installmentGroupsVisible, setInstallmentGroupsVisible] = useState(false);
    const [installmentGroup, setInstallmentGroup] = useState([]);
    const [installmentTitle, setInstallmentTitle] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteExpense, setDeleteExpense] = useState(null);
    const [deleteIsInstallment, setDeleteIsInstallment] = useState(false);

    const { language, t } = useLanguage();
    const { colors } = useTheme();
    const { currency } = useCurrency();
    const { showSuccess } = useSnackbar();

    const [filter, setFilter] = useState('thisMonth');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [quickFilter, setQuickFilter] = useState('all');
    const [monthlySummary, setMonthlySummary] = useState({
        budgetTotalEUR: null,
        budgetRemainingEUR: null,
        forecastEUR: 0,
        spentEUR: 0,
    });
    const [summaryLoading, setSummaryLoading] = useState(false);

    useEffect(() => {
        loadExpenses();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        scheduleReminders({ expenses, subscriptions, t }).catch((error) => {
            console.error('Error scheduling reminders:', error);
        });
    }, [expenses, subscriptions, t]);

    useEffect(() => {
        loadMonthlySummary();
    }, [expenses, subscriptions]);

    useFocusEffect(
        useCallback(() => {
            runAutoBackupIfDue().catch((error) => {
                console.error('Error running auto backup:', error);
            });
        }, [])
    );

    const loadExpenses = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const [data, subData] = await Promise.all([
                expenseService.getAll(),
                subscriptionService.getAll(),
            ]);
            setExpenses(data);
            setSubscriptions(subData);
            return data;
        } catch (error) {
            Alert.alert(t('error'), t('couldNotLoad'));
            console.error(error);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadExpenses();
    };

    const getInstallmentMeta = (expense) => {
        const description = expense?.description?.trim();
        const match = description?.match(/\((\d+)\/(\d+)\)$/);
        if (!match) return null;
        const base = description.replace(/\s*\(\d+\/\d+\)$/, '').trim();
        return {
            index: parseInt(match[1], 10),
            total: parseInt(match[2], 10),
            base,
        };
    };

    const isInstallmentExpense = (expense) => /\((\d+)\/(\d+)\)$/.test(expense?.description || '');
    const isSubscriptionExpense = (expense) => expense?.description?.includes('(Subscription)');

    const getInstallmentStartKey = (expense, meta) => {
        if (!expense?.date || !meta) return null;
        const date = new Date(expense.date);
        const start = new Date(date);
        start.setMonth(start.getMonth() - (meta.index - 1));
        return start.toISOString().split('T')[0];
    };

    const getInstallmentGroup = (expense, sourceExpenses = expenses) => {
        const target = getInstallmentMeta(expense);
        if (!target) return [];
        const targetStartKey = getInstallmentStartKey(expense, target);

        return sourceExpenses
            .map((exp) => {
                const meta = getInstallmentMeta(exp);
                if (!meta) return null;
                const startKey = getInstallmentStartKey(exp, meta);
                return {
                    ...exp,
                    _installmentIndex: meta.index,
                    _installmentTotal: meta.total,
                    _installmentBase: meta.base,
                    _installmentStartKey: startKey,
                };
            })
            .filter(Boolean)
            .filter((exp) => (
                exp._installmentBase === target.base
                && exp._installmentTotal === target.total
                && (exp.currency || 'EUR') === (expense.currency || 'EUR')
                && exp._installmentStartKey === targetStartKey
            ))
            .sort((a, b) => a._installmentIndex - b._installmentIndex);
    };

    const loadMonthlySummary = async () => {
        setSummaryLoading(true);
        try {
            const monthExpenses = filterByThisMonth(expenses);
            const convertedExpenses = await Promise.all(
                monthExpenses.map(async (exp) => {
                    const amount = Number(exp.amount) || 0;
                    const amountEUR = exp.currency && exp.currency !== 'EUR'
                        ? await currencyService.convertToEUR(amount, exp.currency)
                        : amount;
                    return { ...exp, _amountEUR: amountEUR };
                })
            );

            const spentEUR = convertedExpenses.reduce((sum, exp) => sum + (exp._amountEUR || 0), 0);
            const installmentsEUR = convertedExpenses
                .filter((exp) => isInstallmentExpense(exp))
                .reduce((sum, exp) => sum + (exp._amountEUR || 0), 0);

            const activeSubscriptions = (subscriptions || []).filter((sub) => sub.active);
            const subscriptionsEUR = (await Promise.all(
                activeSubscriptions.map(async (sub) => {
                    const amount = Number(sub.amount) || 0;
                    const amountEUR = sub.currency && sub.currency !== 'EUR'
                        ? await currencyService.convertToEUR(amount, sub.currency)
                        : amount;
                    let monthly = amountEUR;
                    if (sub.frequency === 'WEEKLY') monthly *= 4.33;
                    if (sub.frequency === 'YEARLY') monthly /= 12;
                    return monthly;
                })
            )).reduce((sum, val) => sum + (val || 0), 0);

            const budgets = await getBudgets();
            const budgetEntries = Object.values(budgets || {});
            const budgetTotalEUR = (await Promise.all(
                budgetEntries.map(async (budget) => {
                    if (!budget?.limit) return 0;
                    const limit = Number(budget.limit) || 0;
                    return budget.currency && budget.currency !== 'EUR'
                        ? await currencyService.convertToEUR(limit, budget.currency)
                        : limit;
                })
            )).reduce((sum, val) => sum + (val || 0), 0);

            setMonthlySummary({
                budgetTotalEUR: budgetEntries.length > 0 ? budgetTotalEUR : null,
                budgetRemainingEUR: budgetEntries.length > 0 ? (budgetTotalEUR - spentEUR) : null,
                forecastEUR: installmentsEUR + subscriptionsEUR,
                spentEUR,
            });
        } catch (error) {
            console.error('Error loading monthly summary:', error);
        } finally {
            setSummaryLoading(false);
        }
    };

    const withTimeout = (promise, timeoutMs = 12000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('timeout')), timeoutMs);
            }),
        ]);
    };

    const deleteExpensesByIds = async (ids, successMessage, afterDelete) => {
        if (!ids || ids.length === 0) {
            Alert.alert(t('error'), t('couldNotDelete'));
            return;
        }
        setDeleting(true);
        const idsSet = new Set(ids);
        const optimistic = expenses.filter((exp) => !idsSet.has(exp.id));
        setExpenses(optimistic);
        if (afterDelete) {
            afterDelete(optimistic);
        }

        try {
            const results = await Promise.allSettled(
                ids.map((expenseId) => withTimeout(expenseService.delete(expenseId)))
            );
            const hasFailure = results.some((result) => result.status === 'rejected');
            if (hasFailure) {
                Alert.alert(t('error'), t('couldNotDelete'));
            } else {
                showSuccess(successMessage);
            }
        } catch (error) {
            Alert.alert(t('error'), t('couldNotDelete'));
        } finally {
            setDeleting(false);
        }

        loadExpenses({ silent: true });
    };

    const handleDeleteExpense = async (id) => {
        await deleteExpensesByIds([id], t('expenseDeleted'));
    };

    const handleDeleteInstallments = async (expense, mode) => {
        const meta = getInstallmentMeta(expense);
        if (!meta) {
            await handleDeleteExpense(expense.id);
            return;
        }

        const group = getInstallmentGroup(expense);
        const ids = mode === 'remaining'
            ? group.filter((item) => item._installmentIndex >= meta.index).map((item) => item.id)
            : [expense.id];

        await deleteExpensesByIds(
            ids,
            mode === 'remaining' ? t('installmentsDeleted') : t('installmentDeleted'),
            (updatedExpenses) => {
                const refreshedGroup = getInstallmentGroup(expense, updatedExpenses);
                setInstallmentGroup(refreshedGroup);
                if (refreshedGroup.length === 0) {
                    setInstallmentsVisible(false);
                }
            }
        );
    };

    const closeDeleteSheet = () => {
        setDeleteExpense(null);
        setDeleteIsInstallment(false);
    };

    const openDeleteConfirm = (expense) => {
        const meta = getInstallmentMeta(expense);
        setDeleteIsInstallment(!!meta);
        setDeleteExpense(expense);
    };

    const openInstallments = (expense) => {
        const meta = getInstallmentMeta(expense);
        const group = getInstallmentGroup(expense);
        setInstallmentTitle(meta?.base || expense.description || '');
        setInstallmentGroup(group);
        setInstallmentsVisible(true);
    };

    const handleEditInstallmentGroup = (groupItems) => {
        if (!groupItems || groupItems.length === 0) return;
        setInstallmentsVisible(false);
        setInstallmentGroupsVisible(false);
        setExpenseToEdit(null);
        setPrefillExpense(null);
        setInstallmentGroupToEdit(groupItems);
        setShowAddModal(true);
    };

    const installmentGroups = useMemo(() => {
        const now = new Date();
        const groups = new Map();

        expenses.forEach((exp) => {
            const meta = getInstallmentMeta(exp);
            if (!meta) return;
            const startKey = getInstallmentStartKey(exp, meta);

            const key = [
                meta.base,
                meta.total,
                exp.currency || 'EUR',
                startKey || '',
            ].join('|');

            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    title: meta.base,
                    totalCount: meta.total,
                    startKey,
                    items: [],
                });
            }

            groups.get(key).items.push({
                ...exp,
                _installmentIndex: meta.index,
                _installmentTotal: meta.total,
                _installmentBase: meta.base,
                _installmentStartKey: startKey,
            });
        });

        return Array.from(groups.values()).map((group) => {
            group.items.sort((a, b) => a._installmentIndex - b._installmentIndex);
            const nextItem = group.items.find((item) => new Date(item.date) >= now) || group.items[group.items.length - 1];
            return {
                ...group,
                nextDate: nextItem?.date,
            };
        }).sort((a, b) => new Date(a.nextDate || 0) - new Date(b.nextDate || 0));
    }, [expenses]);

    const handleCategoryPress = (category) => {
        setSelectedCategory(category);
        setShowCategoryModal(true);
    };

    const getCategoryExpenses = () => {
        const filtered = filteredExpenses.filter((exp) => normalizeCategory(exp.category) === selectedCategory);
        return applySorting(filtered);
    };

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

    const getSearchFilteredExpenses = (expensesToFilter) => {
        if (!debouncedQuery.trim()) {
            return expensesToFilter;
        }

        const query = debouncedQuery.toLowerCase().trim();
        return expensesToFilter.filter(exp => {
            if (exp.description.toLowerCase().includes(query)) return true;

            const categoryTranslated = t(`categories.${exp.category}`)?.toLowerCase() || '';
            if (categoryTranslated.includes(query)) return true;
            if (exp.category?.toLowerCase().includes(query)) return true;

            const amountStr = exp.amount?.toString() || '';
            if (amountStr.includes(query)) return true;

            const dateFormatted = formatDate(exp.date, language)?.toLowerCase() || '';
            if (dateFormatted.includes(query)) return true;

            const expCurrency = (exp.currency || 'EUR').toLowerCase();
            if (expCurrency.includes(query)) return true;

            return false;
        });
    };

    const applyQuickFilter = (expensesToFilter) => {
        if (quickFilter === 'installments') {
            return expensesToFilter.filter((exp) => isInstallmentExpense(exp));
        }
        if (quickFilter === 'subscriptions') {
            return expensesToFilter.filter((exp) => isSubscriptionExpense(exp));
        }
        if (quickFilter === 'due7') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return expensesToFilter.filter((exp) => {
                const expDate = new Date(exp.date);
                return expDate >= today && expDate <= nextWeek;
            });
        }
        return expensesToFilter;
    };

    const getFilteredExpenses = () => {
        const dateFiltered = getDateFilteredExpenses();
        const searchFiltered = getSearchFilteredExpenses(dateFiltered);
        return applyQuickFilter(searchFiltered);
    };

    const filteredExpenses = getFilteredExpenses();
    const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const quickAddItems = useMemo(() => {
        const unique = [];
        const seen = new Set();
        const sorted = sortByNewest(expenses);

        for (const exp of sorted) {
            if (!exp?.description) continue;
            if (isInstallmentExpense(exp) || isSubscriptionExpense(exp)) continue;
            const key = `${exp.description}|${exp.amount}|${exp.currency || 'EUR'}|${exp.category || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(exp);
            if (unique.length >= 6) break;
        }

        return unique;
    }, [expenses]);

    const filteredGrouped = filteredExpenses.reduce((acc, exp) => {
        const category = normalizeCategory(exp.category);
        if (!acc[category]) acc[category] = 0;
        acc[category] += exp.amount;
        return acc;
    }, {});

    const screenWidth = Dimensions.get('window').width;
    const chartRadius = Math.min((screenWidth - 80) / 2, 130);
    const chartInnerRadius = Math.round(chartRadius * 0.6);

    const filteredChartData = Object.entries(filteredGrouped)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({
            value,
            color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
            onPress: () => handleCategoryPress(name),
            _categoryName: name,
        }));

    const highestExpense = getHighestExpense(filteredExpenses);
    const averagePerDay = getAveragePerDay(filteredExpenses);
    const topCategory = getTopCategory(filteredExpenses);

    const handleEditExpense = (expense) => {
        setExpenseToEdit(expense);
        setInstallmentGroupToEdit(null);
        setPrefillExpense(null);
        setShowAddModal(true);
        setShowCategoryModal(false);
    };

    const handleQuickAdd = (expense) => {
        setExpenseToEdit(null);
        setInstallmentGroupToEdit(null);
        setPrefillExpense({
            description: expense.description?.replace(/\s*\(\d+\/\d+\)$/, '').trim(),
            amount: expense.amount,
            currency: expense.currency || 'EUR',
            category: expense.category || '',
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setExpenseToEdit(null);
        setInstallmentGroupToEdit(null);
        setPrefillExpense(null);
    };

    const styles = createStyles(colors);

    const summaryCard = (
        <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.summaryTitle}>{t('monthlySummary')}</Text>
                </View>
                {summaryLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('budgetRemaining')}</Text>
                {monthlySummary.budgetRemainingEUR !== null ? (
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.budgetRemainingEUR}
                        style={styles.summaryValue}
                    />
                ) : (
                    <Text style={styles.summaryPlaceholder}>--</Text>
                )}
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('forecastedSpending')}</Text>
                <CurrencyDisplay
                    amountInEUR={monthlySummary.forecastEUR}
                    style={styles.summaryValue}
                />
            </View>

            {monthlySummary.budgetTotalEUR !== null && (
                <View style={styles.summaryMetaRow}>
                    <Text style={styles.summaryMetaLabel}>{t('budgetTotal')}</Text>
                    <CurrencyDisplay
                        amountInEUR={monthlySummary.budgetTotalEUR}
                        style={styles.summaryMetaValue}
                    />
                </View>
            )}
        </View>
    );

    const quickAddSection = quickAddItems.length > 0 ? (
        <View style={styles.quickAddSection}>
            <View style={styles.quickAddHeader}>
                <Ionicons name="flash-outline" size={16} color={colors.text} style={{ marginRight: spacing.sm }} />
                <View style={styles.quickAddHeaderText}>
                    <Text style={styles.quickAddTitle}>{t('quickAdd')}</Text>
                    <Text style={styles.quickAddHint}>{t('quickAddHint')}</Text>
                </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.quickAddRow}>
                    {quickAddItems.map((item) => {
                        const symbol = getCurrencyByCode(item.currency || 'EUR').symbol;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.quickAddChip}
                                onPress={() => handleQuickAdd(item)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.quickAddChipTitle} numberOfLines={1}>
                                    {item.description}
                                </Text>
                                <Text style={styles.quickAddChipAmount}>
                                    {symbol}{Number(item.amount).toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    ) : null;

    const quickFilters = [
        { key: 'all', label: t('all') },
        { key: 'installments', label: t('filterInstallments') },
        { key: 'subscriptions', label: t('filterSubscriptions') },
        { key: 'due7', label: t('filterDue7Days') },
    ];

    const quickFiltersRow = (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickFiltersRow}>
                {quickFilters.map((filterOption) => (
                    <TouchableOpacity
                        key={filterOption.key}
                        style={[
                            styles.quickFilterChip,
                            quickFilter === filterOption.key && styles.quickFilterChipActive,
                        ]}
                        onPress={() => setQuickFilter(filterOption.key)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.quickFilterText,
                                quickFilter === filterOption.key && styles.quickFilterTextActive,
                            ]}
                        >
                            {filterOption.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

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

            {/* Conte?do */}
            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {quickFiltersRow}
                {summaryCard}
                {quickAddSection}
                {expenses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="mail-open-outline" size={64} color={colors.textLight} />
                        <Text style={styles.emptyText}>{t('noExpenses')}</Text>
                        <Text style={styles.emptySubtext}>{t('noExpensesSubtext')}</Text>
                    </View>
                ) : filteredExpenses.length === 0 ? (
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
                                        donut
                                        radius={chartRadius}
                                        innerRadius={chartInnerRadius}
                                        innerCircleColor={colors.surface}
                                        centerLabelComponent={() => (
                                            <View style={styles.donutCenter}>
                                                <CurrencyDisplay
                                                    amountInEUR={filteredTotal}
                                                    style={styles.donutTotal}
                                                />
                                                <Text style={styles.donutLabel}>{t('total')}</Text>
                                            </View>
                                        )}
                                        focusOnPress
                                        isAnimated
                                        animationDuration={600}
                                    />
                                </View>

                                {/* Legendas dentro do card do donut */}
                                <View style={styles.legendsDivider} />
                                <View style={styles.legendsInline}>
                                    <View style={styles.legendsTitleRow}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.textLight} style={{ marginRight: spacing.xs }} />
                                        <Text style={styles.legendsTitle}>{t('tapToSeeDetails')}</Text>
                                    </View>
                                    {filteredChartData.map((item, index) => (
                                        <CategoryLegend
                                            key={index}
                                            category={item._categoryName}
                                            amount={item.value}
                                            total={filteredTotal}
                                            onPress={() => handleCategoryPress(item._categoryName)}
                                        />
                                    ))}
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

                            <View style={styles.statsRow}>
                                {/* Maior gasto */}
                                {highestExpense && (
                                    <View style={styles.statCompact}>
                                        <View style={[styles.statIconCircle, { backgroundColor: colors.warning + '20' }]}>
                                            <Ionicons name="arrow-up-outline" size={16} color={colors.warning} />
                                        </View>
                                        <Text style={styles.statLabel}>{t('highestExpense')}</Text>
                                        <CurrencyDisplay
                                            amountInEUR={highestExpense.amount}
                                            originalCurrency={highestExpense.currency}
                                            style={styles.statValue}
                                        />
                                        <Text style={styles.statSubtext} numberOfLines={1}>
                                            {highestExpense.description}
                                        </Text>
                                    </View>
                                )}

                                {/* Média por dia */}
                                <View style={styles.statCompact}>
                                    <View style={[styles.statIconCircle, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={styles.statLabel}>{t('averagePerDay')}</Text>
                                    <CurrencyDisplay
                                        amountInEUR={averagePerDay}
                                        style={styles.statValue}
                                    />
                                    <Text style={styles.statSubtext}>
                                        {filteredExpenses.length} {t('expenses').toLowerCase()}
                                    </Text>
                                </View>
                            </View>

                            {/* Categoria top - full width */}
                            {topCategory && (
                                <View style={styles.statTopCategory}>
                                    <View style={[styles.statIconCircle, { backgroundColor: colors.success + '20' }]}>
                                        <Ionicons name="trophy-outline" size={16} color={colors.success} />
                                    </View>
                                    <View style={styles.statTopCategoryInfo}>
                                        <Text style={styles.statLabel}>{t('topCategory')}</Text>
                                        <Text style={styles.statTopCategoryName}>
                                            {t(`categories.${normalizeCategory(topCategory.name)}`)}
                                        </Text>
                                    </View>
                                    <View style={styles.statTopCategoryBadge}>
                                        <Text style={styles.statTopCategoryBadgeText}>{topCategory.percentage}%</Text>
                                    </View>
                                </View>
                            )}
                            </View>
                        </FadeIn>

                        {/* Previsão de Gastos */}
                        <FadeIn delay={400}>
                            <ForecastSection
                                expenses={expenses}
                                subscriptions={subscriptions}
                                installmentGroups={installmentGroups}
                                onOpenInstallments={() => setInstallmentGroupsVisible(true)}
                            />
                        </FadeIn>

                        {/* Gráfico de Evolução Mensal */}
                        <FadeIn delay={600}>
                            <MonthlyChart expenses={expenses} />
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
                    <TouchableWithoutFeedback onPress={() => setShowCategoryModal(false)}>
                        <View style={styles.overlayTouchArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.categoryModal}>
                        <View style={styles.handleBar} />
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
                                        activeOpacity={1}
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
                                            onPress={() => openDeleteConfirm(item)}
                                        >
                                            <Ionicons name="trash-outline" size={24} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                leftOpenValue={70}
                                rightOpenValue={-70}
                                disableLeftSwipe={false}
                                disableRightSwipe={false}
                                directionalDistanceChangeThreshold={10}
                                swipeToOpenPercent={20}
                                closeOnRowPress={true}
                                closeOnRowBeginSwipe={true}
                                friction={50}
                                tension={40}
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
                onEdit={(expense) => {
                    setDetailExpense(null);
                    setTimeout(() => {
                        setExpenseToEdit(expense);
                        setShowAddModal(true);
                    }, 300);
                }}
                onDelete={(expense) => {
                    setDetailExpense(null);
                    setTimeout(() => {
                        openDeleteConfirm(expense);
                    }, 300);
                }}
                onViewInstallments={(expense) => {
                    setDetailExpense(null);
                    setTimeout(() => {
                        openInstallments(expense);
                    }, 300);
                }}
            />

            {/* Modal de Adicionar/Editar */}
            <AddExpenseModal
                visible={showAddModal}
                onClose={handleCloseModal}
                onSuccess={loadExpenses}
                expenseToEdit={expenseToEdit}
                installmentGroupToEdit={installmentGroupToEdit}
                prefillExpense={prefillExpense}
            />

            <InstallmentGroupsModal
                visible={installmentGroupsVisible}
                groups={installmentGroups}
                onClose={() => setInstallmentGroupsVisible(false)}
                onSelectGroup={(group) => {
                    setInstallmentGroupsVisible(false);
                    setInstallmentTitle(group.title);
                    setInstallmentGroup(group.items);
                    setInstallmentsVisible(true);
                }}
            />

            <InstallmentsModal
                visible={installmentsVisible}
                title={installmentTitle}
                installments={installmentGroup}
                onClose={() => setInstallmentsVisible(false)}
                onDeleteInstallment={handleDeleteInstallments}
                onEditGroup={() => handleEditInstallmentGroup(installmentGroup)}
            />

            <DeleteConfirmSheet
                visible={!!deleteExpense}
                isInstallment={deleteIsInstallment}
                onClose={closeDeleteSheet}
                onDelete={() => {
                    const target = deleteExpense;
                    closeDeleteSheet();
                    if (target) {
                        handleDeleteExpense(target.id);
                    }
                }}
                onDeleteSingle={() => {
                    const target = deleteExpense;
                    closeDeleteSheet();
                    if (target) {
                        handleDeleteInstallments(target, 'single');
                    }
                }}
                onDeleteRemaining={() => {
                    const target = deleteExpense;
                    closeDeleteSheet();
                    if (target) {
                        handleDeleteInstallments(target, 'remaining');
                    }
                }}
            />

            {deleting && (
                <View style={styles.deletingToast} pointerEvents="none">
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.deletingText}>{t('loading')}</Text>
                </View>
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fabWrapper}
                onPress={() => {
                    setInstallmentGroupToEdit(null);
                    setPrefillExpense(null);
                    setShowAddModal(true);
                }}
                activeOpacity={0.85}
            >
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
    deletingToast: {
        position: 'absolute',
        bottom: spacing.xxl + sizes.fabSize + spacing.sm,
        alignSelf: 'center',
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        ...shadows.small,
    },
    deletingText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.medium,
        color: colors.text,
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
        paddingVertical: spacing.md,
    },
    donutCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    donutTotal: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    donutLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    legendsDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    legendsInline: {
        width: '100%',
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
    overlayTouchArea: {
        flex: 1,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xs,
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
    summaryCard: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.small,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    summaryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryTitle: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    summaryLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
    },
    summaryValue: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    summaryPlaceholder: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.textLight,
    },
    summaryMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    summaryMetaLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    summaryMetaValue: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    quickFiltersRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
    quickFilterChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickFilterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    quickFilterText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    quickFilterTextActive: {
        color: colors.textWhite,
    },
    quickAddSection: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        ...shadows.small,
    },
    quickAddHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    quickAddHeaderText: {
        flex: 1,
    },
    quickAddTitle: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    quickAddHint: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginTop: 2,
    },
    quickAddRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickAddChip: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minWidth: 140,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickAddChipTitle: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    quickAddChipAmount: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.bold,
        color: colors.primary,
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
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    statCompact: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'flex-start',
    },
    statIconCircle: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    statLabel: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.text,
        marginBottom: 2,
    },
    statSubtext: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    statTopCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
    },
    statTopCategoryInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    statTopCategoryName: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.text,
    },
    statTopCategoryBadge: {
        backgroundColor: colors.success + '20',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
    },
    statTopCategoryBadgeText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.bold,
        color: colors.success,
    },
});
