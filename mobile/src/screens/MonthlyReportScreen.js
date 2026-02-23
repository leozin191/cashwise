import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { expenseService, incomeService, subscriptionService, aiService } from '../services/api';
import currencyService from '../services/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import { getCurrencyByCode } from '../constants/currencies';
import CurrencyDisplay from '../components/CurrencyDisplay';
import MonthlyChart from '../components/MonthlyChart';
import ExpenseCard from '../components/ExpenseCard';
import IncomeCard from '../components/IncomeCard';
import { formatDate, sortByNewest, sortByOldest, sortByHighest, sortByLowest, getAveragePerDay, getHighestExpense, getTopCategory, calculateForecast } from '../utils/helpers';
import { generateReportHTML } from '../utils/pdfGenerator';
import { getBudgets } from '../utils/budgets';

const getMonthKey = (dateValue) => {
    if (!dateValue) return null;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getPreviousMonthKey = (monthKey) => {
    if (!monthKey) return null;
    const [year, month] = monthKey.split('-').map((value) => parseInt(value, 10));
    if (!year || !month) return null;
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return getMonthKey(date);
};

const getMonthOptions = (count = 12, language = 'pt') => {
    const months = [];
    const now = new Date();
    const locale = language === 'en' ? 'en-US' : 'pt-BR';

    for (let i = 0; i < count; i += 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = getMonthKey(date);
        const label = date
            .toLocaleDateString(locale, { month: 'short', year: 'numeric' })
            .replace('.', '');
        months.push({ key, label });
    }

    return months;
};

const filterByMonthKey = (items, monthKey) => {
    const safeItems = Array.isArray(items) ? items : [];
    if (!monthKey) return safeItems;
    return safeItems.filter((item) => getMonthKey(item?.date) === monthKey);
};

export default function MonthlyReportScreen() {
    const navigation = useNavigation();
    const { t, language } = useLanguage();
    const { colors } = useTheme();
    const { currency, getCurrencyInfo } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        incomeEUR: 0,
        expensesEUR: 0,
        balanceEUR: 0,
        lastIncomeEUR: 0,
        lastExpensesEUR: 0,
        lastBalanceEUR: 0,
    });
    const [chartExpenses, setChartExpenses] = useState([]);
    const [currentMonthExpenses, setCurrentMonthExpenses] = useState([]);
    const [showMonthExpenses, setShowMonthExpenses] = useState(false);
    const [rawExpenses, setRawExpenses] = useState([]);
    const [rawIncomes, setRawIncomes] = useState([]);
    const [convertedExpenses, setConvertedExpenses] = useState([]);
    const [convertedIncomes, setConvertedIncomes] = useState([]);
    const [currentMonthIncomes, setCurrentMonthIncomes] = useState([]);
    const [showMonthIncomes, setShowMonthIncomes] = useState(false);
    const [selectedMonthKey, setSelectedMonthKey] = useState(getMonthKey(new Date()));
    const [monthExpenseQuery, setMonthExpenseQuery] = useState('');
    const [monthExpenseSort, setMonthExpenseSort] = useState('newest');
    const [monthIncomeQuery, setMonthIncomeQuery] = useState('');
    const [monthIncomeSort, setMonthIncomeSort] = useState('newest');
    const [exportingCSV, setExportingCSV] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingHTML, setExportingHTML] = useState(false);
    const [reportSubscriptions, setReportSubscriptions] = useState([]);
    const [reportBudgets, setReportBudgets] = useState({});
    const [aiSummary, setAiSummary] = useState('');
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

    const monthOptions = useMemo(() => getMonthOptions(12, language), [language]);
    const selectedMonthLabel = useMemo(() => {
        const match = monthOptions.find((option) => option.key === selectedMonthKey);
        return match ? match.label : t('thisMonth');
    }, [monthOptions, selectedMonthKey, t]);

    useFocusEffect(
        useCallback(() => {
            loadReport();
        }, [])
    );

    useEffect(() => {
        if (!monthOptions.length) return;
        const hasSelected = monthOptions.some((option) => option.key === selectedMonthKey);
        if (!hasSelected) {
            setSelectedMonthKey(monthOptions[0].key);
        }
    }, [monthOptions, selectedMonthKey]);

    useEffect(() => {
        setMonthExpenseQuery('');
        setMonthExpenseSort('newest');
        setMonthIncomeQuery('');
        setMonthIncomeSort('newest');
        setAiSummary('');
    }, [selectedMonthKey]);

    const convertToEUR = async (items) => {
        return Promise.all(
            items.map(async (item) => {
                const amount = Number(item.amount) || 0;
                const amountEUR = item.currency && item.currency !== 'EUR'
                    ? await currencyService.convertToEUR(amount, item.currency)
                    : amount;
                return { ...item, _amountEUR: amountEUR, amount: amountEUR };
            })
        );
    };

    const convertToCurrency = async (items, targetCurrency) => {
        const safeItems = Array.isArray(items) ? items : [];
        return Promise.all(
            safeItems.map(async (item) => {
                const amount = Number(item.amount) || 0;
                const amountEUR = item.currency && item.currency !== 'EUR'
                    ? await currencyService.convertToEUR(amount, item.currency)
                    : amount;
                const convertedAmount = targetCurrency === 'EUR'
                    ? amountEUR
                    : await currencyService.convert(amountEUR, targetCurrency);
                return { ...item, amount: convertedAmount, currency: targetCurrency };
            })
        );
    };

    const sumEUR = (items) => items.reduce((sum, item) => sum + (item._amountEUR || 0), 0);

    const loadReport = async () => {
        try {
            setLoading(true);
            const [expenses, incomes, subscriptions, budgets] = await Promise.all([
                expenseService.getAll(),
                incomeService.getAll(),
                subscriptionService.getAll(),
                getBudgets(),
            ]);

            const safeExpenses = Array.isArray(expenses) ? expenses : [];
            const safeIncomes = Array.isArray(incomes) ? incomes : [];

            const convertedExpenses = await convertToEUR(safeExpenses);
            const convertedIncomes = await convertToEUR(safeIncomes);
            setRawExpenses(safeExpenses);
            setRawIncomes(safeIncomes);
            setConvertedExpenses(convertedExpenses);
            setConvertedIncomes(convertedIncomes);
            setChartExpenses(safeExpenses);
            setReportSubscriptions(Array.isArray(subscriptions) ? subscriptions : []);
            setReportBudgets(budgets || {});
        } catch (error) {
            console.error('Error loading monthly report:', error);
        } finally {
            setLoading(false);
        }
    };

    const buildMonthlyExportData = async () => {
        const monthExpenses = currentMonthExpenses.length > 0 || rawExpenses.length === 0
            ? currentMonthExpenses
            : filterByMonthKey(rawExpenses, selectedMonthKey);
        const monthIncomes = currentMonthIncomes.length > 0 || rawIncomes.length === 0
            ? currentMonthIncomes
            : filterByMonthKey(rawIncomes, selectedMonthKey);

        const convertedExpenses = await convertToCurrency(monthExpenses, currency);
        const convertedIncomes = await convertToCurrency(monthIncomes, currency);

        const subscriptions = reportSubscriptions.length > 0
            ? reportSubscriptions
            : await subscriptionService.getAll();
        const convertedSubscriptions = await convertToCurrency(subscriptions || [], currency);

        const budgets = Object.keys(reportBudgets || {}).length > 0
            ? reportBudgets
            : await getBudgets();
        const convertedBudgets = {};
        for (const [category, budget] of Object.entries(budgets || {})) {
            const limit = Number(budget?.limit) || 0;
            const amountEUR = budget.currency && budget.currency !== 'EUR'
                ? await currencyService.convertToEUR(limit, budget.currency)
                : limit;
            const convertedAmount = currency === 'EUR'
                ? amountEUR
                : await currencyService.convert(amountEUR, currency);
            convertedBudgets[category] = {
                ...budget,
                limit: convertedAmount,
                currency,
            };
        }

        const allExpenses = rawExpenses.length > 0 ? rawExpenses : monthExpenses;
        const convertedAllExpenses = await convertToCurrency(allExpenses, currency);
        const forecast = calculateForecast(convertedAllExpenses, convertedSubscriptions, language);

        const totalExpenses = convertedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const totalIncome = convertedIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
        const balanceTotal = totalIncome - totalExpenses;

        const stats = {
            totalExpenses,
            totalIncome,
            balanceTotal,
            transactionCount: convertedExpenses.length,
            highestExpense: getHighestExpense(convertedExpenses),
            averagePerDay: getAveragePerDay(convertedExpenses),
            topCategory: getTopCategory(convertedExpenses),
        };

        const monthlyData = [
            { label: selectedMonthLabel, value: totalExpenses },
        ];

        return {
            convertedExpenses,
            convertedIncomes,
            convertedSubscriptions,
            convertedBudgets,
            forecast,
            monthlyData,
            stats,
        };
    };

    const sanitizeCSV = (val) => {
        const str = String(val ?? '');
        if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
        return str;
    };

    const handleExportMonthlyCSV = async () => {
        if (currentMonthExpenses.length === 0) {
            Alert.alert(t('attention'), t('noExpensesToExport'));
            return;
        }

        try {
            setExportingCSV(true);
            const BOM = '\uFEFF';
            const header = 'Date,Description,Category,Amount,Currency\n';
            const rows = currentMonthExpenses.map((exp) => {
                const desc = `"${sanitizeCSV((exp.description || '').replace(/"/g, '""'))}"`;
                const cat = `"${sanitizeCSV((exp.category || '').replace(/"/g, '""'))}"`;
                return `${exp.date},${desc},${cat},${exp.amount},${exp.currency || 'EUR'}`;
            }).join('\n');

            const csv = BOM + header + rows;
            const filePath = `${FileSystem.documentDirectory}cashwise-expenses-${selectedMonthKey}.csv`;

            await FileSystem.writeAsStringAsync(filePath, csv, { encoding: 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, { mimeType: 'text/csv' });
            } else {
                Alert.alert(t('error'), t('sharingNotAvailable'));
            }
        } catch (error) {
            Alert.alert(t('error'), t('exportFailed'));
        } finally {
            setExportingCSV(false);
        }
    };

    const handleExportMonthlyPDF = async () => {
        if (currentMonthExpenses.length === 0 && currentMonthIncomes.length === 0) {
            Alert.alert(t('attention'), t('noDataToExport'));
            return;
        }

        try {
            setExportingPDF(true);
            const {
                convertedExpenses,
                convertedIncomes,
                convertedSubscriptions,
                convertedBudgets,
                forecast,
                monthlyData,
                stats,
            } = await buildMonthlyExportData();
            const html = generateReportHTML({
                expenses: convertedExpenses,
                incomes: convertedIncomes,
                subscriptions: convertedSubscriptions,
                budgets: convertedBudgets,
                forecast,
                monthlyData,
                stats,
                currencySymbol: getCurrencyInfo().symbol,
                language,
                t,
            });

            const { uri } = await Print.printToFileAsync({
                html,
                width: 612,
                height: 792,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
            } else {
                Alert.alert(t('error'), t('sharingNotAvailable'));
            }
        } catch (error) {
            Alert.alert(t('error'), t('pdfExportFailed'));
        } finally {
            setExportingPDF(false);
        }
    };

    const handleExportMonthlyHTML = async () => {
        if (currentMonthExpenses.length === 0 && currentMonthIncomes.length === 0) {
            Alert.alert(t('attention'), t('noDataToExport'));
            return;
        }

        try {
            setExportingHTML(true);
            const {
                convertedExpenses,
                convertedIncomes,
                convertedSubscriptions,
                convertedBudgets,
                forecast,
                monthlyData,
                stats,
            } = await buildMonthlyExportData();
            const html = generateReportHTML({
                expenses: convertedExpenses,
                incomes: convertedIncomes,
                subscriptions: convertedSubscriptions,
                budgets: convertedBudgets,
                forecast,
                monthlyData,
                stats,
                currencySymbol: getCurrencyInfo().symbol,
                language,
                t,
            });

            const filePath = `${FileSystem.documentDirectory}cashwise-report-${selectedMonthKey}.html`;
            await FileSystem.writeAsStringAsync(filePath, html, { encoding: 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, { mimeType: 'text/html' });
            } else {
                Alert.alert(t('error'), t('sharingNotAvailable'));
            }
        } catch (error) {
            Alert.alert(t('error'), t('exportFailed'));
        } finally {
            setExportingHTML(false);
        }
    };

    useEffect(() => {
        if (!selectedMonthKey) return;
        const previousMonthKey = getPreviousMonthKey(selectedMonthKey);

        const currentExpenses = filterByMonthKey(convertedExpenses, selectedMonthKey);
        const lastExpenses = filterByMonthKey(convertedExpenses, previousMonthKey);
        const currentIncomes = filterByMonthKey(convertedIncomes, selectedMonthKey);
        const lastIncomes = filterByMonthKey(convertedIncomes, previousMonthKey);

        const incomeEUR = sumEUR(currentIncomes);
        const expensesEUR = sumEUR(currentExpenses);
        const balanceEUR = incomeEUR - expensesEUR;

        const lastIncomeEUR = sumEUR(lastIncomes);
        const lastExpensesEUR = sumEUR(lastExpenses);
        const lastBalanceEUR = lastIncomeEUR - lastExpensesEUR;

        setSummary({
            incomeEUR,
            expensesEUR,
            balanceEUR,
            lastIncomeEUR,
            lastExpensesEUR,
            lastBalanceEUR,
        });

        const currentMonthRaw = filterByMonthKey(rawExpenses, selectedMonthKey)
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        setCurrentMonthExpenses(currentMonthRaw);
        const currentMonthIncomeRaw = filterByMonthKey(rawIncomes, selectedMonthKey)
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        setCurrentMonthIncomes(currentMonthIncomeRaw);
    }, [convertedExpenses, convertedIncomes, rawExpenses, rawIncomes, selectedMonthKey]);


    const getChange = (current, previous) => {
        if (!previous) {
            return { percent: null, diffEUR: current, isIncrease: current >= 0 };
        }
        const diff = current - previous;
        const percent = (diff / previous) * 100;
        return { percent, diffEUR: diff, isIncrease: diff >= 0 };
    };

    const comparisonItems = [
        {
            key: 'income',
            label: t('income'),
            value: getChange(summary.incomeEUR, summary.lastIncomeEUR),
            tone: colors.success,
        },
        {
            key: 'expenses',
            label: t('expenses'),
            value: getChange(summary.expensesEUR, summary.lastExpensesEUR),
            tone: colors.error,
        },
        {
            key: 'balance',
            label: t('balance'),
            value: getChange(summary.balanceEUR, summary.lastBalanceEUR),
            tone: colors.primary,
        },
    ];

    const totalsByCurrency = useMemo(() => {
        const totals = {};
        currentMonthExpenses.forEach((expense) => {
            const code = expense?.currency || 'EUR';
            const amount = Number(expense?.amount) || 0;
            totals[code] = (totals[code] || 0) + amount;
        });
        return totals;
    }, [currentMonthExpenses]);

    const totalsByCurrencyLabel = useMemo(() => {
        const entries = Object.entries(totalsByCurrency);
        if (entries.length === 0) return '';
        return entries
            .map(([code, amount]) => `${getCurrencyByCode(code).symbol}${amount.toFixed(2)} ${code}`)
            .join(' · ');
    }, [totalsByCurrency]);

    const monthSortOptions = useMemo(
        () => [
            { key: 'newest', label: t('newest') },
            { key: 'oldest', label: t('oldest') },
            { key: 'highest', label: t('highest') },
            { key: 'lowest', label: t('lowest') },
        ],
        [t]
    );

    const visibleMonthExpenses = useMemo(() => {
        const query = monthExpenseQuery.trim().toLowerCase();
        let list = currentMonthExpenses;

        if (query) {
            list = list.filter((expense) => {
                if (!expense) return false;
                if (expense.description?.toLowerCase().includes(query)) return true;

                const categoryLabel = t(`categories.${expense.category}`);
                if (categoryLabel && categoryLabel !== `categories.${expense.category}`) {
                    if (categoryLabel.toLowerCase().includes(query)) return true;
                }
                if (expense.category?.toLowerCase().includes(query)) return true;

                const amountStr = expense.amount?.toString() || '';
                if (amountStr.includes(query)) return true;

                const dateLabel = formatDate(expense.date, language)?.toLowerCase() || '';
                if (dateLabel.includes(query)) return true;

                const currencyLabel = (expense.currency || 'EUR').toLowerCase();
                if (currencyLabel.includes(query)) return true;

                return false;
            });
        }

        if (monthExpenseSort === 'oldest') return sortByOldest(list);
        if (monthExpenseSort === 'highest') return sortByHighest(list);
        if (monthExpenseSort === 'lowest') return sortByLowest(list);
        return sortByNewest(list);
    }, [currentMonthExpenses, monthExpenseQuery, monthExpenseSort, language, t]);

    const visibleMonthIncomes = useMemo(() => {
        const query = monthIncomeQuery.trim().toLowerCase();
        let list = currentMonthIncomes;

        if (query) {
            list = list.filter((income) => {
                if (!income) return false;
                if (income.description?.toLowerCase().includes(query)) return true;

                const categoryLabel = t(`categories.${income.category}`);
                if (categoryLabel && categoryLabel !== `categories.${income.category}`) {
                    if (categoryLabel.toLowerCase().includes(query)) return true;
                }
                if (income.category?.toLowerCase().includes(query)) return true;

                const amountStr = income.amount?.toString() || '';
                if (amountStr.includes(query)) return true;

                const dateLabel = formatDate(income.date, language)?.toLowerCase() || '';
                if (dateLabel.includes(query)) return true;

                const currencyLabel = (income.currency || 'EUR').toLowerCase();
                if (currencyLabel.includes(query)) return true;

                return false;
            });
        }

        if (monthIncomeSort === 'oldest') return sortByOldest(list);
        if (monthIncomeSort === 'highest') return sortByHighest(list);
        if (monthIncomeSort === 'lowest') return sortByLowest(list);
        return sortByNewest(list);
    }, [currentMonthIncomes, monthIncomeQuery, monthIncomeSort, language, t]);

    const handleAiSummary = async () => {
        setAiSummaryLoading(true);
        try {
            const categoryTotals = {};
            currentMonthExpenses.forEach((exp) => {
                const cat = exp.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;
            });
            const topCat = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0];

            const lines = [
                `Analyze my finances for ${selectedMonthLabel} and give a short, friendly summary:`,
                `- Total expenses: €${summary.expensesEUR.toFixed(2)}`,
                `- Total income: €${summary.incomeEUR.toFixed(2)}`,
                `- Balance: €${summary.balanceEUR.toFixed(2)}`,
                `- Transactions: ${currentMonthExpenses.length}`,
                topCat ? `- Top spending category: ${topCat}` : null,
                ``,
                `Reply with 3 short points: 1) What went well  2) What to improve  3) One specific actionable tip for next month.`,
            ].filter(Boolean);

            const { answer } = await aiService.chat(lines.join('\n'));
            setAiSummary(answer);
        } catch {
            setAiSummary(t('aiChatError') || 'Could not generate summary. Please try again.');
        } finally {
            setAiSummaryLoading(false);
        }
    };

    const styles = createStyles(colors);

    const renderMonthSelector = (containerStyle) => {
        if (!monthOptions.length) return null;
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.monthSelector, containerStyle]}
                contentContainerStyle={styles.monthSelectorContent}
            >
                {monthOptions.map((option) => {
                    const isSelected = option.key === selectedMonthKey;
                    return (
                        <TouchableOpacity
                            key={option.key}
                            style={[styles.monthChip, isSelected && styles.monthChipActive]}
                            onPress={() => setSelectedMonthKey(option.key)}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.monthChipText, isSelected && styles.monthChipTextActive]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        );
    };

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
                    <TouchableOpacity
                        style={styles.headerBack}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('monthlyReport')}</Text>
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={() => navigation.navigate('Settings', { returnTo: 'MonthlyReport' })}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="person-outline" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerSubtitle}>{selectedMonthLabel}</Text>
            </LinearGradient>

            <ScrollView style={styles.content}>
                {renderMonthSelector()}
                <View style={styles.exportRow}>
                    <TouchableOpacity
                        style={[styles.exportButton, (exportingCSV || exportingPDF || exportingHTML) && styles.exportButtonDisabled]}
                        onPress={() => {
                            Alert.alert(
                                t('exportReport') || 'Export Report',
                                t('chooseExportFormat') || 'Choose a format',
                                [
                                    { text: t('exportMonthlyCSV') || 'CSV', onPress: handleExportMonthlyCSV },
                                    { text: t('exportMonthlyPDF') || 'PDF', onPress: handleExportMonthlyPDF },
                                    { text: t('exportMonthlyHTML') || 'HTML', onPress: handleExportMonthlyHTML },
                                    { text: t('cancel') || 'Cancel', style: 'cancel' },
                                ]
                            );
                        }}
                        activeOpacity={0.85}
                        disabled={exportingCSV || exportingPDF || exportingHTML}
                    >
                        {(exportingCSV || exportingPDF || exportingHTML) ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="share-outline" size={16} color={colors.primary} />
                        )}
                        <Text style={styles.exportButtonText}>
                            {(exportingCSV || exportingPDF || exportingHTML) ? t('exporting') : (t('exportReport') || 'Export')}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.sectionTitle}>{t('monthlySummary')}</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>{t('income')}</Text>
                            <CurrencyDisplay amountInEUR={summary.incomeEUR} style={styles.summaryValue} />
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>{t('expenses')}</Text>
                            <CurrencyDisplay amountInEUR={summary.expensesEUR} style={styles.summaryValue} />
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>{t('balance')}</Text>
                            <CurrencyDisplay amountInEUR={summary.balanceEUR} style={styles.summaryValue} />
                        </View>
                    </View>
                </View>

                <View style={styles.compareCard}>
                    <Text style={styles.sectionTitle}>{t('vsLastMonth')}</Text>
                    <View style={styles.compareRow}>
                        {comparisonItems.map((item) => {
                            const change = item.value;
                            const hasPercent = typeof change.percent === 'number' && Number.isFinite(change.percent);
                            return (
                                <View key={item.key} style={styles.compareItem}>
                                    <Text style={styles.compareLabel}>{item.label}</Text>
                                    <View style={styles.compareMetric}>
                                        <Ionicons
                                            name={change.isIncrease ? 'trending-up' : 'trending-down'}
                                            size={14}
                                            color={item.tone}
                                        />
                                        <Text style={[styles.comparePercent, { color: item.tone }]}>
                                            {hasPercent ? `${Math.abs(change.percent).toFixed(0)}%` : '--'}
                                        </Text>
                                    </View>
                                    <CurrencyDisplay
                                        amountInEUR={Math.abs(change.diffEUR)}
                                        style={styles.compareValue}
                                    />
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* AI Summary Card */}
                <View style={styles.aiSummaryCard}>
                    <View style={styles.aiSummaryHeader}>
                        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                        <Text style={styles.aiSummaryTitle}>{t('aiMonthSummary') || 'AI Monthly Summary'}</Text>
                    </View>
                    {aiSummary ? (
                        <>
                            <Text style={styles.aiSummaryText}>{aiSummary}</Text>
                            <TouchableOpacity
                                style={styles.aiRegenerateBtn}
                                onPress={handleAiSummary}
                                disabled={aiSummaryLoading}
                                activeOpacity={0.7}
                            >
                                {aiSummaryLoading
                                    ? <ActivityIndicator size="small" color={colors.primary} />
                                    : <>
                                        <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                                        <Text style={styles.aiRegenerateBtnText}>{t('regenerate') || 'Regenerate'}</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.aiSummaryButton, aiSummaryLoading && styles.aiSummaryButtonDisabled]}
                            onPress={handleAiSummary}
                            disabled={aiSummaryLoading}
                            activeOpacity={0.8}
                        >
                            {aiSummaryLoading
                                ? <ActivityIndicator size="small" color={colors.textWhite} />
                                : <Text style={styles.aiSummaryButtonText}>{t('generateSummary') || 'Generate summary'}</Text>
                            }
                        </TouchableOpacity>
                    )}
                </View>

                <MonthlyChart
                    expenses={chartExpenses}
                    selectedMonthKey={selectedMonthKey}
                    onMonthPress={(monthKey) => {
                        if (!monthKey) return;
                        setSelectedMonthKey(monthKey);
                        setShowMonthExpenses(true);
                    }}
                />

                <TouchableOpacity
                    style={styles.monthExpensesCard}
                    onPress={() => setShowMonthExpenses(true)}
                    activeOpacity={0.85}
                >
                    <View style={styles.monthExpensesHeader}>
                        <Text style={styles.sectionTitle}>
                            {t('expenses')} - {selectedMonthLabel}
                        </Text>
                        <Text
                            style={[
                                styles.viewAllText,
                                currentMonthExpenses.length === 0 && styles.viewAllTextDisabled,
                            ]}
                        >
                            {t('viewAll')}
                        </Text>
                    </View>
                    {currentMonthExpenses.length === 0 ? (
                        <Text style={styles.monthExpensesHint}>{t('noExpensesThisMonth')}</Text>
                    ) : (
                        <Text style={styles.monthExpensesHint}>
                            {currentMonthExpenses.length} {t('expenses').toLowerCase()}
                        </Text>
                    )}
                    {totalsByCurrencyLabel ? (
                        <Text style={styles.totalsByCurrencyText}>
                            {t('totalsByCurrency')}: {totalsByCurrencyLabel}
                        </Text>
                    ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.monthExpensesCard}
                    onPress={() => setShowMonthIncomes(true)}
                    activeOpacity={0.85}
                >
                    <View style={styles.monthExpensesHeader}>
                        <Text style={styles.sectionTitle}>
                            {t('income')} - {selectedMonthLabel}
                        </Text>
                        <Text
                            style={[
                                styles.viewAllText,
                                currentMonthIncomes.length === 0 && styles.viewAllTextDisabled,
                            ]}
                        >
                            {t('viewAll')}
                        </Text>
                    </View>
                    {currentMonthIncomes.length === 0 ? (
                        <Text style={styles.monthExpensesHint}>{t('noIncomes')}</Text>
                    ) : (
                        <Text style={styles.monthExpensesHint}>
                            {currentMonthIncomes.length} {t('income').toLowerCase()}
                        </Text>
                    )}
                    <CurrencyDisplay amountInEUR={summary.incomeEUR} style={styles.monthIncomeTotal} />
                </TouchableOpacity>
                <View style={{ height: 60 }} />
            </ScrollView>

            <Modal
                visible={showMonthExpenses}
                animationType="slide"
                transparent
                onRequestClose={() => setShowMonthExpenses(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowMonthExpenses(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {t('expenses')} - {selectedMonthLabel}
                            </Text>
                            <TouchableOpacity onPress={() => setShowMonthExpenses(false)}>
                                <Ionicons name="close" size={18} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        {renderMonthSelector(styles.modalMonthSelector)}
                        <View style={styles.modalSearchRow}>
                            <Ionicons name="search-outline" size={16} color={colors.textLight} />
                            <TextInput
                                value={monthExpenseQuery}
                                onChangeText={setMonthExpenseQuery}
                                placeholder={t('searchExpenses')}
                                placeholderTextColor={colors.textLight}
                                style={styles.modalSearchInput}
                            />
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.modalSortRow}
                            contentContainerStyle={styles.modalSortContent}
                        >
                            {monthSortOptions.map((option) => {
                                const isSelected = option.key === monthExpenseSort;
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[styles.modalSortChip, isSelected && styles.modalSortChipActive]}
                                        onPress={() => setMonthExpenseSort(option.key)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.modalSortText, isSelected && styles.modalSortTextActive]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {totalsByCurrencyLabel ? (
                            <Text style={styles.totalsByCurrencyText}>
                                {t('totalsByCurrency')}: {totalsByCurrencyLabel}
                            </Text>
                        ) : null}
                        {currentMonthExpenses.length === 0 ? (
                            <View style={styles.modalEmpty}>
                                <Ionicons name="receipt-outline" size={40} color={colors.textLight} />
                                <Text style={styles.modalEmptyText}>{t('noExpensesThisMonth')}</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                                {visibleMonthExpenses.length === 0 ? (
                                    <View style={styles.modalEmpty}>
                                        <Ionicons name="search-outline" size={40} color={colors.textLight} />
                                        <Text style={styles.modalEmptyText}>{t('noResultsFound')}</Text>
                                    </View>
                                ) : (
                                    visibleMonthExpenses.map((expense) => (
                                        <ExpenseCard key={expense.id} expense={expense} />
                                    ))
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showMonthIncomes}
                animationType="slide"
                transparent
                onRequestClose={() => setShowMonthIncomes(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowMonthIncomes(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {t('income')} - {selectedMonthLabel}
                            </Text>
                            <TouchableOpacity onPress={() => setShowMonthIncomes(false)}>
                                <Ionicons name="close" size={18} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        {renderMonthSelector(styles.modalMonthSelector)}
                        <View style={styles.modalSearchRow}>
                            <Ionicons name="search-outline" size={16} color={colors.textLight} />
                            <TextInput
                                value={monthIncomeQuery}
                                onChangeText={setMonthIncomeQuery}
                                placeholder={t('searchIncomes')}
                                placeholderTextColor={colors.textLight}
                                style={styles.modalSearchInput}
                            />
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.modalSortRow}
                            contentContainerStyle={styles.modalSortContent}
                        >
                            {monthSortOptions.map((option) => {
                                const isSelected = option.key === monthIncomeSort;
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[styles.modalSortChip, isSelected && styles.modalSortChipActive]}
                                        onPress={() => setMonthIncomeSort(option.key)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.modalSortText, isSelected && styles.modalSortTextActive]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {currentMonthIncomes.length === 0 ? (
                            <View style={styles.modalEmpty}>
                                <Ionicons name="cash-outline" size={40} color={colors.textLight} />
                                <Text style={styles.modalEmptyText}>{t('noIncomes')}</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                                {visibleMonthIncomes.length === 0 ? (
                                    <View style={styles.modalEmpty}>
                                        <Ionicons name="search-outline" size={40} color={colors.textLight} />
                                        <Text style={styles.modalEmptyText}>{t('noResultsFound')}</Text>
                                    </View>
                                ) : (
                                    visibleMonthIncomes.map((income) => (
                                        <IncomeCard key={income.id} income={income} />
                                    ))
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
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
        loadingText: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
        },
        header: {
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.xl,
            borderBottomLeftRadius: borderRadius.xxl,
            borderBottomRightRadius: borderRadius.xxl,
        },
        headerTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        headerBack: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
        },
        headerTitle: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.textWhite,
        },
        headerSubtitle: {
            marginTop: spacing.sm,
            fontSize: fontSize.sm,
            fontFamily: fontFamily.medium,
            color: 'rgba(255,255,255,0.7)',
        },
        headerActionButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        content: {
            flex: 1,
            paddingTop: spacing.lg,
        },
        sectionTitle: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.md,
        },
        summaryCard: {
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            ...shadows.small,
        },
        summaryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        summaryItem: {
            flex: 1,
            alignItems: 'center',
        },
        summaryLabel: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
            marginBottom: spacing.xs,
        },
        summaryValue: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        summaryDivider: {
            width: 1,
            height: 28,
            backgroundColor: colors.border,
        },
        compareCard: {
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            ...shadows.small,
        },
        compareRow: {
            flexDirection: 'row',
            gap: spacing.sm,
        },
        compareItem: {
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
        },
        compareLabel: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
            marginBottom: spacing.xs,
        },
        compareMetric: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.xs,
        },
        comparePercent: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.bold,
        },
        compareValue: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        exportRow: {
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.xl,
            marginBottom: spacing.md,
        },
        exportButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        exportButtonDisabled: {
            opacity: 0.6,
        },
        exportButtonText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
        monthSelector: {
            paddingHorizontal: spacing.xl,
            marginBottom: spacing.md,
        },
        monthSelectorContent: {
            gap: spacing.sm,
            paddingRight: spacing.xl,
        },
        monthChip: {
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        monthChipActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primaryBg,
        },
        monthChipText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
        },
        monthChipTextActive: {
            color: colors.primary,
            fontFamily: fontFamily.semibold,
        },
        monthExpensesCard: {
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            ...shadows.small,
        },
        monthExpensesHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
        },
        monthExpensesHint: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        monthIncomeTotal: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginTop: spacing.xs,
        },
        viewAllText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
        viewAllTextDisabled: {
            color: colors.textLight,
        },
        totalsByCurrencyText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
            marginTop: spacing.xs,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'flex-end',
        },
        modalBackdrop: {
            flex: 1,
        },
        modalSheet: {
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xl,
            maxHeight: '80%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
        },
        modalTitle: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        modalMonthSelector: {
            paddingHorizontal: 0,
            marginBottom: spacing.sm,
        },
        modalSearchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            marginBottom: spacing.sm,
        },
        modalSearchInput: {
            flex: 1,
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.text,
        },
        modalSortRow: {
            marginBottom: spacing.sm,
        },
        modalSortContent: {
            gap: spacing.sm,
            paddingRight: spacing.xl,
        },
        modalSortChip: {
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        modalSortChipActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primaryBg,
        },
        modalSortText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
        },
        modalSortTextActive: {
            color: colors.primary,
            fontFamily: fontFamily.semibold,
        },
        modalList: {
            flex: 1,
        },
        modalListContent: {
            paddingBottom: spacing.xl,
        },
        modalEmpty: {
            alignItems: 'center',
            paddingVertical: spacing.xl,
        },
        modalEmptyText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
            marginTop: spacing.sm,
        },
        aiSummaryCard: {
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.primary + '30',
            ...shadows.small,
        },
        aiSummaryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
        },
        aiSummaryTitle: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        aiSummaryText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.text,
            lineHeight: 20,
        },
        aiSummaryButton: {
            backgroundColor: colors.primary,
            borderRadius: borderRadius.full,
            paddingVertical: spacing.sm,
            alignItems: 'center',
        },
        aiSummaryButtonDisabled: {
            opacity: 0.6,
        },
        aiSummaryButtonText: {
            color: colors.textWhite,
            fontFamily: fontFamily.semibold,
            fontSize: fontSize.sm,
        },
        aiRegenerateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-end',
            gap: spacing.xs,
            marginTop: spacing.md,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.primary + '40',
            backgroundColor: colors.primaryBg,
        },
        aiRegenerateBtnText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.medium,
            color: colors.primary,
        },
    });
