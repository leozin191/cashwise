import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    useWindowDimensions,
    SectionList,
} from 'react-native';

import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { expenseService, incomeService, subscriptionService } from '../services/api';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import IncomeDetailModal from '../components/IncomeDetailModal';
import CategoryLegend from '../components/CategoryLegend';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import HomeSummaryCard from '../components/HomeSummaryCard';
import HomeIncomeSection from '../components/HomeIncomeSection';
import HomeQuickAdd from '../components/HomeQuickAdd';

import { CATEGORY_COLORS, normalizeCategory } from '../constants/categories';

import { spacing } from '../constants/theme';
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
import { addDataChangedListener } from '../services/dataEvents';

import {
    getInstallmentMeta,
    isInstallmentExpense,
    isSubscriptionExpense,
    buildInstallmentGroupMap,
    getInstallmentGroup,
} from '../utils/installments';
import { createStyles } from './homeStyles';

export default function HomeScreen() {
    const navigation = useNavigation();
    const returnToScreen = 'Home';
    const [expenses, setExpenses] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [detailExpense, setDetailExpense] = useState(null);
    const [detailIncome, setDetailIncome] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [incomeToEdit, setIncomeToEdit] = useState(null);
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
    const [deleteIncome, setDeleteIncome] = useState(null);
    const [showAllIncomes, setShowAllIncomes] = useState(false);

    const { language, t } = useLanguage();
    const { colors } = useTheme();
    const { currency } = useCurrency();
    const { showSuccess } = useSnackbar();

    const [filter, setFilter] = useState('thisMonth');
    const [incomePeriodFilter, setIncomePeriodFilter] = useState('thisMonth');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [incomeSearchQuery, setIncomeSearchQuery] = useState('');
    const [debouncedIncomeQuery, setDebouncedIncomeQuery] = useState('');
    const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [quickFilter, setQuickFilter] = useState('all');
    const [monthlySummary, setMonthlySummary] = useState({
        budgetTotalEUR: null,
        budgetRemainingEUR: null,
        forecastEUR: 0,
        incomeEUR: 0,
        spentEUR: 0,
        balanceEUR: 0,
        totalsByCurrency: {},
    });
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [filteredTotals, setFilteredTotals] = useState({ expensesEUR: 0, incomeEUR: 0 });
    const [convertedFilteredExpenses, setConvertedFilteredExpenses] = useState([]);

    useEffect(() => {
        loadExpenses();
    }, []);

    useEffect(() => {
        const subscription = addDataChangedListener((event) => {
            if (!event || event.type === 'expenses' || event.type === 'incomes' || event.type === 'subscriptions' || event.type === 'all') {
                loadExpenses({ silent: true });
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedIncomeQuery(incomeSearchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [incomeSearchQuery]);

    useEffect(() => {
        scheduleReminders({ expenses, subscriptions, t }).catch((error) => {
            console.error('Error scheduling reminders:', error);
        });
    }, [expenses, subscriptions, t]);

    useEffect(() => {
        loadMonthlySummary();
    }, [expenses, incomes, subscriptions]);

    useFocusEffect(
        useCallback(() => {
            runAutoBackupIfDue().catch((error) => {
                console.error('Error running auto backup:', error);
            });
            loadExpenses({ silent: true });
        }, [])
    );

    const loadExpenses = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const [data, incomeData, subData] = await Promise.all([
                expenseService.getAll(),
                incomeService.getAll(),
                subscriptionService.getAll(),
            ]);
            const safeExpenses = Array.isArray(data) ? data : [];
            const safeIncomes = Array.isArray(incomeData) ? incomeData : [];
            const safeSubscriptions = Array.isArray(subData) ? subData : [];
            setExpenses(safeExpenses);
            setIncomes(safeIncomes);
            setSubscriptions(safeSubscriptions);
            return safeExpenses;
        } catch (error) {
            Alert.alert(t('error'), t('couldNotLoad'));
            setExpenses([]);
            setIncomes([]);
            setSubscriptions([]);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadExpenses();
    };

    const installmentGroupMap = useMemo(() => buildInstallmentGroupMap(expenses), [expenses]);

    const getInstallmentGroupForExpense = (expense, sourceExpenses = expenses) => {
        const map = sourceExpenses === expenses ? installmentGroupMap : buildInstallmentGroupMap(sourceExpenses);
        return getInstallmentGroup(expense, sourceExpenses, map);
    };

    const loadMonthlySummary = async () => {
        setSummaryLoading(true);
        try {
            const rates = await currencyService.getRates();
            const convertToEUR = (amount, code) => {
                if (code === 'EUR') return amount;
                const rate = rates && rates[code];
                if (!rate) return amount;
                return amount / rate;
            };
            const monthExpenses = filterByThisMonth(expenses);
            const totalsByCurrency = monthExpenses.reduce((acc, exp) => {
                const code = exp?.currency || 'EUR';
                const amount = Number(exp?.amount) || 0;
                acc[code] = (acc[code] || 0) + amount;
                return acc;
            }, {});
            const convertedExpenses = monthExpenses.map((exp) => {
                const amount = Number(exp.amount) || 0;
                const amountEUR = convertToEUR(amount, exp.currency || 'EUR');
                return { ...exp, _amountEUR: amountEUR };
            });

            const monthIncomes = filterByThisMonth(incomes);
            const convertedIncomes = monthIncomes.map((inc) => {
                const amount = Number(inc.amount) || 0;
                const amountEUR = convertToEUR(amount, inc.currency || 'EUR');
                return { ...inc, _amountEUR: amountEUR };
            });

            const spentEUR = convertedExpenses.reduce((sum, exp) => sum + (exp._amountEUR || 0), 0);
            const incomeEUR = convertedIncomes.reduce((sum, inc) => sum + (inc._amountEUR || 0), 0);
            const balanceEUR = incomeEUR - spentEUR;
            const installmentsEUR = convertedExpenses
                .filter((exp) => isInstallmentExpense(exp))
                .reduce((sum, exp) => sum + (exp._amountEUR || 0), 0);

            const activeSubscriptions = (subscriptions || []).filter((sub) => sub.active);
            const subscriptionsEUR = activeSubscriptions.reduce((sum, sub) => {
                const amount = Number(sub.amount) || 0;
                const amountEUR = convertToEUR(amount, sub.currency || 'EUR');
                let monthly = amountEUR;
                if (sub.frequency === 'WEEKLY') monthly *= 4.33;
                if (sub.frequency === 'YEARLY') monthly /= 12;
                return sum + (monthly || 0);
            }, 0);

            const budgets = await getBudgets();
            const budgetEntries = Object.values(budgets || {});
            const budgetTotalEUR = budgetEntries.reduce((sum, budget) => {
                if (!budget?.limit) return sum;
                const limit = Number(budget.limit) || 0;
                const limitEUR = convertToEUR(limit, budget.currency || 'EUR');
                return sum + (limitEUR || 0);
            }, 0);

            setMonthlySummary({
                budgetTotalEUR: budgetEntries.length > 0 ? budgetTotalEUR : null,
                budgetRemainingEUR: budgetEntries.length > 0 ? (budgetTotalEUR - spentEUR) : null,
                forecastEUR: installmentsEUR + subscriptionsEUR,
                incomeEUR,
                spentEUR,
                balanceEUR,
                totalsByCurrency,
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

    const handleDeleteIncome = async (incomeId) => {
        if (!incomeId) return;
        try {
            await incomeService.delete(incomeId);
            showSuccess(t('incomeDeleted'));
        } catch (error) {
            Alert.alert(t('error'), t('couldNotDelete'));
        } finally {
            loadExpenses({ silent: true });
        }
    };

    const handleDeleteInstallments = async (expense, mode) => {
        const meta = getInstallmentMeta(expense);
        if (!meta) {
            await handleDeleteExpense(expense.id);
            return;
        }

        const group = getInstallmentGroupForExpense(expense);
        const ids = mode === 'remaining'
            ? group.filter((item) => item._installmentIndex >= meta.index).map((item) => item.id)
            : [expense.id];

        await deleteExpensesByIds(
            ids,
            mode === 'remaining' ? t('installmentsDeleted') : t('installmentDeleted'),
            (updatedExpenses) => {
                const refreshedGroup = getInstallmentGroupForExpense(expense, updatedExpenses);
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

    const closeIncomeDeleteSheet = () => {
        setDeleteIncome(null);
    };

    const openIncomeDeleteConfirm = (income) => {
        setDeleteIncome(income);
    };

    const openInstallments = (expense) => {
        const meta = getInstallmentMeta(expense);
        const group = getInstallmentGroupForExpense(expense);
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
        return Array.from(installmentGroupMap.groupByKey.values())
            .map((group) => {
                const items = [...group.items].sort((a, b) => a._installmentIndex - b._installmentIndex);
                const nextItem = items.find((item) => new Date(item.date) >= now) || items[items.length - 1];
                return {
                    ...group,
                    items,
                    nextDate: nextItem?.date,
                };
            })
            .sort((a, b) => new Date(a.nextDate || 0) - new Date(b.nextDate || 0));
    }, [installmentGroupMap]);

    const handleCategoryPress = useCallback((category) => {
        setSelectedCategory(category);
        setShowCategoryModal(true);
    }, []);

    const getDateFilteredExpenses = () => {
        const safeExpenses = Array.isArray(expenses) ? expenses : [];
        switch (filter) {
            case 'thisMonth':
                return filterByThisMonth(safeExpenses);
            case 'last30Days':
                return filterByLast30Days(safeExpenses);
            default:
                return filterByAll(safeExpenses);
        }
    };

    const getDateFilteredIncomes = () => {
        const safeIncomes = Array.isArray(incomes) ? incomes : [];
        switch (incomePeriodFilter) {
            case 'thisMonth':
                return filterByThisMonth(safeIncomes);
            case 'last30Days':
                return filterByLast30Days(safeIncomes);
            default:
                return filterByAll(safeIncomes);
        }
    };

    const getSearchFilteredExpenses = (expensesToFilter = []) => {
        const safeExpenses = Array.isArray(expensesToFilter) ? expensesToFilter : [];
        if (!debouncedQuery.trim()) {
            return safeExpenses;
        }

        const query = debouncedQuery.toLowerCase().trim();
        return safeExpenses.filter((exp) => {
            if (!exp) return false;
            if (exp.description?.toLowerCase().includes(query)) return true;

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

    const getSearchFilteredIncomes = (incomesToFilter = []) => {
        const safeIncomes = Array.isArray(incomesToFilter) ? incomesToFilter : [];
        if (!debouncedIncomeQuery.trim()) {
            return safeIncomes;
        }

        const query = debouncedIncomeQuery.toLowerCase().trim();
        return safeIncomes.filter((inc) => {
            if (!inc) return false;
            if (inc.description?.toLowerCase().includes(query)) return true;

            const category = normalizeCategory(inc.category);
            const categoryTranslated = t(`categories.${category}`)?.toLowerCase() || '';
            if (categoryTranslated.includes(query)) return true;
            if (inc.category?.toLowerCase().includes(query)) return true;

            const amountStr = inc.amount?.toString() || '';
            if (amountStr.includes(query)) return true;

            const dateFormatted = formatDate(inc.date, language)?.toLowerCase() || '';
            if (dateFormatted.includes(query)) return true;

            const incCurrency = (inc.currency || 'EUR').toLowerCase();
            if (incCurrency.includes(query)) return true;

            return false;
        });
    };

    const applyIncomeCategoryFilter = (incomesToFilter = []) => {
        const safeIncomes = Array.isArray(incomesToFilter) ? incomesToFilter : [];
        if (incomeCategoryFilter === 'all') return safeIncomes;
        return safeIncomes.filter((inc) => normalizeCategory(inc.category) === incomeCategoryFilter);
    };

    const getFilteredIncomes = () => {
        const dateFiltered = getDateFilteredIncomes();
        const categoryFiltered = applyIncomeCategoryFilter(dateFiltered);
        return getSearchFilteredIncomes(categoryFiltered);
    };

    const applyQuickFilter = (expensesToFilter = []) => {
        const safeExpenses = Array.isArray(expensesToFilter) ? expensesToFilter : [];
        if (quickFilter === 'installments') {
            return safeExpenses.filter((exp) => isInstallmentExpense(exp));
        }
        if (quickFilter === 'subscriptions') {
            return safeExpenses.filter((exp) => isSubscriptionExpense(exp));
        }
        return safeExpenses;
    };

    const getFilteredExpenses = () => {
        const dateFiltered = getDateFilteredExpenses();
        const searchFiltered = getSearchFilteredExpenses(dateFiltered);
        return applyQuickFilter(searchFiltered);
    };

    const filteredExpenses = useMemo(
        () => getFilteredExpenses() || [],
        [expenses, filter, debouncedQuery, language, quickFilter]
    );

    const categoryExpenses = useMemo(() => {
        if (!selectedCategory) return [];
        const safeExpenses = Array.isArray(filteredExpenses) ? filteredExpenses : [];
        const selectedKey = normalizeCategory(selectedCategory);
        const result = safeExpenses.filter((exp) => {
            if (!exp) return false;
            return normalizeCategory(exp.category) === selectedKey;
        });
        return result;
    }, [filteredExpenses, selectedCategory]);

    const categorySections = useMemo(() => {
        if (!selectedCategory || categoryExpenses.length === 0) return [];

        const amountById = new Map(
            convertedFilteredExpenses.map((exp) => [exp.id, exp._amountEUR || 0])
        );
        const groups = new Map();

        categoryExpenses.forEach((exp) => {
            const dateKey = exp.date ? exp.date.split('T')[0] : 'unknown';
            if (!groups.has(dateKey)) {
                groups.set(dateKey, { items: [], totalEUR: 0 });
            }
            const group = groups.get(dateKey);
            group.items.push(exp);
            group.totalEUR += amountById.get(exp.id) ?? (Number(exp.amount) || 0);
        });

        const sortItems = (items) => {
            if (sortBy === 'highest') return sortByHighest(items);
            if (sortBy === 'lowest') return sortByLowest(items);
            if (sortBy === 'oldest') return sortByOldest(items);
            return sortByNewest(items);
        };

        const dayKeys = Array.from(groups.keys()).sort((a, b) => {
            if (sortBy === 'oldest') {
                return new Date(a) - new Date(b);
            }
            return new Date(b) - new Date(a);
        });

        return dayKeys.map((key) => {
            const group = groups.get(key);
            return {
                key,
                title: key === 'unknown' ? t('date') : formatDate(key, language),
                totalEUR: group.totalEUR,
                count: group.items.length,
                data: sortItems(group.items),
            };
        });
    }, [categoryExpenses, convertedFilteredExpenses, language, selectedCategory, sortBy, t]);


    const filteredIncomes = useMemo(
        () => sortByNewest(getFilteredIncomes()),
        [incomes, incomePeriodFilter, debouncedIncomeQuery, incomeCategoryFilter, language, t]
    );
    const filteredTotal = filteredTotals.expensesEUR;
    const incomeTotal = filteredTotals.incomeEUR;
    const incomeCategories = useMemo(() => {
        const categories = new Set();
        const dateFiltered = getDateFilteredIncomes();

        dateFiltered.forEach((inc) => {
            categories.add(normalizeCategory(inc.category));
        });

        return Array.from(categories).sort((a, b) => {
            const aLabel = t(`categories.${a}`) || a;
            const bLabel = t(`categories.${b}`) || b;
            return aLabel.localeCompare(bLabel);
        });
    }, [incomes, incomePeriodFilter, language, t]);

    useEffect(() => {
        let isActive = true;

        const convertFilteredTotals = async () => {
            try {
                const rates = await currencyService.getRates();
                if (!isActive) return;

                const convertToEUR = (amount, code) => {
                    if (code === 'EUR') return amount;
                    const rate = rates && rates[code];
                    if (!rate) return amount;
                    return amount / rate;
                };

                const convertedExpenses = filteredExpenses.map((exp) => {
                    const amount = Number(exp.amount) || 0;
                    const amountEUR = convertToEUR(amount, exp.currency || 'EUR');
                    return { ...exp, _amountEUR: amountEUR };
                });

                const convertedIncomes = filteredIncomes.map((inc) => {
                    const amount = Number(inc.amount) || 0;
                    const amountEUR = convertToEUR(amount, inc.currency || 'EUR');
                    return { ...inc, _amountEUR: amountEUR };
                });

                if (!isActive) return;

                setConvertedFilteredExpenses(convertedExpenses);
                setFilteredTotals({
                    expensesEUR: convertedExpenses.reduce((sum, exp) => sum + (exp._amountEUR || 0), 0),
                    incomeEUR: convertedIncomes.reduce((sum, inc) => sum + (inc._amountEUR || 0), 0),
                });
            } catch (error) {
                console.error('Error converting filtered totals:', error);
            }
        };

        convertFilteredTotals();

        return () => {
            isActive = false;
        };
    }, [filteredExpenses, filteredIncomes]);

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

    const convertedStatsExpenses = useMemo(
        () => (Array.isArray(convertedFilteredExpenses) ? convertedFilteredExpenses : [])
            .map((exp) => ({ ...exp, amount: exp._amountEUR || 0 })),
        [convertedFilteredExpenses]
    );
    const { width: screenWidth } = useWindowDimensions();
    const chartRadius = Math.min((screenWidth - 80) / 2, 130);
    const chartInnerRadius = Math.round(chartRadius * 0.6);

    const chartMetrics = useMemo(() => {
        if (convertedStatsExpenses.length === 0) {
            return { chartData: [], chartTotal: 0 };
        }

        const grouped = convertedStatsExpenses.reduce((acc, exp) => {
            const category = normalizeCategory(exp.category);
            const amount = Number(exp.amount) || 0;
            if (!acc[category]) acc[category] = 0;
            acc[category] += amount;
            return acc;
        }, {});

        const chartData = Object.entries(grouped)
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({
                value,
                color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
                onPress: () => handleCategoryPress(name),
                _categoryName: name,
            }));

        const chartTotal = chartData.reduce((sum, item) => sum + (item.value || 0), 0);
        return { chartData, chartTotal };
    }, [convertedStatsExpenses, handleCategoryPress]);

    const filteredChartData = chartMetrics.chartData;
    const chartTotal = chartMetrics.chartTotal;

    const statsSummary = useMemo(() => ({
        highestExpense: getHighestExpense(convertedStatsExpenses),
        averagePerDay: getAveragePerDay(convertedStatsExpenses),
        topCategory: getTopCategory(convertedStatsExpenses),
    }), [convertedStatsExpenses]);

    const { highestExpense, averagePerDay, topCategory } = statsSummary;

    const handleEditExpense = (expense) => {
        setExpenseToEdit(expense);
        setInstallmentGroupToEdit(null);
        setPrefillExpense(null);
        setShowAddModal(true);
        setShowCategoryModal(false);
    };

    const handleEditIncome = (income) => {
        setIncomeToEdit(income);
        setShowIncomeModal(true);
    };

    const handleOpenSubscriptions = () => {
        navigation.navigate('Subscriptions');
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

    const handleCloseIncomeModal = () => {
        setShowIncomeModal(false);
        setIncomeToEdit(null);
    };

    const styles = useMemo(() => createStyles(colors), [colors]);

    const totalsByCurrencyLabel = useMemo(() => {
        const entries = Object.entries(monthlySummary.totalsByCurrency || {});
        if (entries.length === 0) return '';
        return entries
            .map(([code, amount]) => `${getCurrencyByCode(code).symbol}${amount.toFixed(2)} ${code}`)
            .join(' · ');
    }, [monthlySummary.totalsByCurrency]);

    const quickFilters = [
        { key: 'all', label: t('all') },
        { key: 'installments', label: t('filterInstallments') },
        { key: 'subscriptions', label: t('filterSubscriptions') },
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

    const showForecastAtTop = quickFilter === 'installments' || quickFilter === 'subscriptions';

    const quickFilterMeta = {
        all: { label: t('all'), icon: 'layers-outline', color: colors.textLight },
        installments: { label: t('filterInstallments'), icon: 'card-outline', color: colors.warning },
        subscriptions: { label: t('filterSubscriptions'), icon: 'repeat-outline', color: colors.primary },
    };
    const activeFilterMeta = quickFilterMeta[quickFilter] || quickFilterMeta.all;
    const showFilterSummary = quickFilter !== 'all';

    const filterSummaryCard = showFilterSummary ? (
        <View style={styles.filterSummaryCard}>
            <View style={styles.filterSummaryLeft}>
                <View style={[styles.filterSummaryIcon, { backgroundColor: activeFilterMeta.color + '20' }]}>
                    <Ionicons name={activeFilterMeta.icon} size={16} color={activeFilterMeta.color} />
                </View>
                <View>
                    <Text style={styles.filterSummaryTitle}>{activeFilterMeta.label}</Text>
                    <Text style={styles.filterSummarySubtitle}>{t(filter)}</Text>
                </View>
            </View>
            <View style={styles.filterSummaryRight}>
                <CurrencyDisplay amountInEUR={filteredTotal} style={styles.filterSummaryTotal} />
                <Text style={styles.filterSummaryCount}>
                    {filteredExpenses.length} {t('expenses').toLowerCase()}
                </Text>
            </View>
        </View>
    ) : null;

    const forecastSection = (
        <ForecastSection
            expenses={expenses}
            subscriptions={subscriptions}
            installmentGroups={installmentGroups}
            onOpenInstallments={() => setInstallmentGroupsVisible(true)}
            onPressSubscriptions={handleOpenSubscriptions}
        />
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
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="wallet-outline" size={24} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.headerTitle}>{t('appName')}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={() => navigation.navigate('Settings', { returnTo: returnToScreen })}
                        activeOpacity={0.8}
                        accessibilityLabel={t('settings')}
                        accessibilityRole="button"
                    >
                        <Ionicons name="person-outline" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
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

            <View style={styles.stickySummary}>
                <View style={styles.stickySummaryItem}>
                    <Text style={styles.stickyLabel}>{t('totalExpenses')}</Text>
                    <CurrencyDisplay amountInEUR={filteredTotal} style={styles.stickyAmount} />
                </View>
                <View style={styles.stickyDivider} />
                <View style={styles.stickySummaryItem}>
                    <Text style={styles.stickyLabel}>{t('totalIncome')}</Text>
                    <CurrencyDisplay amountInEUR={incomeTotal} style={styles.stickyAmount} />
                </View>
            </View>


            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {quickFiltersRow}
                <HomeSummaryCard
                    monthlySummary={monthlySummary}
                    summaryLoading={summaryLoading}
                    totalsByCurrencyLabel={totalsByCurrencyLabel}
                />
                {filterSummaryCard}
                {showForecastAtTop && forecastSection}
                <HomeIncomeSection
                    filteredIncomes={filteredIncomes}
                    incomeTotal={incomeTotal}
                    incomePeriodFilter={incomePeriodFilter}
                    setIncomePeriodFilter={setIncomePeriodFilter}
                    incomeSearchQuery={incomeSearchQuery}
                    setIncomeSearchQuery={setIncomeSearchQuery}
                    incomeCategoryFilter={incomeCategoryFilter}
                    setIncomeCategoryFilter={setIncomeCategoryFilter}
                    incomeCategories={incomeCategories}
                    showAllIncomes={showAllIncomes}
                    setShowAllIncomes={setShowAllIncomes}
                    onDetailIncome={setDetailIncome}
                />
                <HomeQuickAdd
                    quickAddItems={quickAddItems}
                    onQuickAdd={handleQuickAdd}
                />
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

                    </View>
                ) : (
                    <View style={styles.chartSection}>
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
                                                    amountInEUR={chartTotal}
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
                                            total={chartTotal}
                                            onPress={() => handleCategoryPress(item._categoryName)}
                                        />
                                    ))}
                                </View>
                            </View>
                            </FadeIn>
                        )}
                        <FadeIn delay={300}>
                            <View style={styles.statsContainer}>
                            <View style={styles.statsTitleRow}>
                                <Ionicons name="stats-chart-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.statsTitle}>{t('statistics')}</Text>
                            </View>

                            <View style={styles.statsRow}>
                                {highestExpense && (
                                    <View style={styles.statCompact}>
                                        <View style={[styles.statIconCircle, { backgroundColor: colors.warningBg }]}>
                                            <Ionicons name="arrow-up-outline" size={16} color={colors.warning} />
                                        </View>
                                        <Text style={styles.statLabel}>{t('highestExpense')}</Text>
                                        <CurrencyDisplay
                                            amountInEUR={highestExpense.amount}
                                            style={styles.statValue}
                                        />
                                        <Text style={styles.statSubtext} numberOfLines={1}>
                                            {highestExpense.description}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.statCompact}>
                                    <View style={[styles.statIconCircle, { backgroundColor: colors.primaryBg }]}>
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

                            {topCategory && (
                                <View style={styles.statTopCategory}>
                                    <View style={[styles.statIconCircle, { backgroundColor: colors.successBg }]}>
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

                        {!showForecastAtTop && (
                            <FadeIn delay={400}>
                                {forecastSection}
                            </FadeIn>
                        )}

                        <FadeIn delay={600}>
                            <MonthlyChart expenses={expenses} />
                        </FadeIn>

                    </View>
                )}
            </ScrollView>

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

                        {categoryExpenses.length > 0 && (
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

                    {categoryExpenses.length === 0 ? (
                            <View style={styles.emptyCategory}>
                                <Text style={styles.emptyCategoryText}>{t('noExpenses')}</Text>
                            </View>
                        ) : (
                            <SectionList
                                sections={categorySections}
                                keyExtractor={(item) => item.id.toString()}
                                renderSectionHeader={({ section }) => (
                                    <View style={styles.categoryDayHeader}>
                                        <View>
                                            <Text style={styles.categoryDayTitle}>{section.title}</Text>
                                            <Text style={styles.categoryDaySubtitle}>
                                                {section.count} {t('expenses').toLowerCase()}
                                            </Text>
                                        </View>
                                        <CurrencyDisplay
                                            amountInEUR={section.totalEUR}
                                            style={styles.categoryDayTotal}
                                        />
                                    </View>
                                )}
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
                                contentContainerStyle={styles.categoryListContent}
                                stickySectionHeadersEnabled={false}
                            />
                        )}
                    </View>
                </View>
            </Modal>

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

            <AddExpenseModal
                visible={showAddModal}
                onClose={handleCloseModal}
                onSuccess={loadExpenses}
                expenseToEdit={expenseToEdit}
                installmentGroupToEdit={installmentGroupToEdit}
                prefillExpense={prefillExpense}
            />

            <AddIncomeModal
                visible={showIncomeModal}
                onClose={handleCloseIncomeModal}
                onSuccess={loadExpenses}
                incomeToEdit={incomeToEdit}
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

            <IncomeDetailModal
                visible={!!detailIncome}
                income={detailIncome}
                onClose={() => setDetailIncome(null)}
                onEdit={(income) => {
                    setDetailIncome(null);
                    setTimeout(() => {
                        handleEditIncome(income);
                    }, 300);
                }}
                onDelete={(income) => {
                    setDetailIncome(null);
                    setTimeout(() => {
                        openIncomeDeleteConfirm(income);
                    }, 300);
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

            <DeleteConfirmSheet
                visible={!!deleteIncome}
                onClose={closeIncomeDeleteSheet}
                onDelete={() => {
                    const target = deleteIncome;
                    closeIncomeDeleteSheet();
                    if (target) {
                        handleDeleteIncome(target.id);
                    }
                }}
                title={t('deleteIncome')}
                message={t('deleteIncomeConfirm')}
            />

            {deleting && (
                <View style={styles.deletingToast} pointerEvents="none">
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.deletingText}>{t('loading')}</Text>
                </View>
            )}

        </View>
    );
}
