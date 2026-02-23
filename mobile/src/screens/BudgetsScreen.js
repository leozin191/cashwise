import { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing } from '../constants/theme';
import { createStyles } from './budgetsStyles';
import { CATEGORIES, normalizeCategory } from '../constants/categories';
import CategoryIcon from '../components/CategoryIcon';
import { getBudgets, saveBudget, deleteBudget, calculateProgress, getAlertLevel } from '../utils/budgets';
import currencyService from '../services/currency';
import { filterByThisMonth } from '../utils/helpers';
import { expenseService, aiService } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import ConfirmSheet from '../components/ConfirmSheet';

export default function BudgetsScreen() {
    const navigation = useNavigation();
    const returnToScreen = 'Budgets';
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();
    const { showSuccess, showError } = useSnackbar();

    const [budgets, setBudgets] = useState({});
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [limitValue, setLimitValue] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [convertedBudgets, setConvertedBudgets] = useState({});
    const [convertedSpent, setConvertedSpent] = useState({});
    const [editingBudget, setEditingBudget] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [budgetAdvice, setBudgetAdvice] = useState(null);
    const [adviceLoading, setAdviceLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [currency]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const budgetsData = await getBudgets();
            setBudgets(budgetsData);

            const allExpenses = await expenseService.getAll();
            const thisMonth = filterByThisMonth(allExpenses);
            setExpenses(thisMonth);

            const convertedLimits = {};
            for (const [category, budget] of Object.entries(budgetsData)) {
                const inEUR = await currencyService.convertToEUR(budget.limit, budget.currency);
                const inCurrentCurrency = await currencyService.convert(inEUR, currency);
                convertedLimits[category] = inCurrentCurrency;
            }
            setConvertedBudgets(convertedLimits);

            const spent = {};
            for (const category of Object.keys(budgetsData)) {
                const filtered = thisMonth.filter(exp => {
                    const expCategory = normalizeCategory(exp.category);
                    return expCategory === category;
                });

                const converted = await Promise.all(
                    filtered.map(async (exp) => {
                        const inEUR = await currencyService.convertToEUR(exp.amount, exp.currency || 'EUR');
                        return await currencyService.convert(inEUR, currency);
                    })
                );

                spent[category] = converted.reduce((sum, val) => sum + val, 0);
            }
            setConvertedSpent(spent);
        } catch (error) {
            console.error('Error loading budgets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const calculateSpent = (category) => {
        return convertedSpent[category] || 0;
    };

    const handleSaveBudget = async () => {
        if (!selectedCategory || !limitValue || !Number.isFinite(parseFloat(limitValue)) || parseFloat(limitValue) <= 0) {
            Alert.alert(t('attention'), t('enterLimit'));
            return;
        }

        const success = await saveBudget(selectedCategory, parseFloat(limitValue), currency, editingBudget?.id);

        if (success) {
            showSuccess(editingBudget ? t('budgetUpdated') : t('budgetSaved'));
            setShowModal(false);
            setSelectedCategory('');
            setLimitValue('');
            setEditingBudget(null);
            setTimeout(() => loadData(), 500);
        }
    };

    const handleEditBudget = (category, budget) => {
        const convertedLimit = convertedBudgets[category] || budget.limit;
        setEditingBudget({ id: budget.id, category, limit: convertedLimit, currency: budget.currency });
        setSelectedCategory(category);
        setLimitValue(convertedLimit.toFixed(0));
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCategory('');
        setLimitValue('');
        setEditingBudget(null);
    };

    const handleDeleteBudget = (id) => {
        setConfirmConfig({
            title: t('deleteBudget'),
            message: t('deleteBudgetConfirm'),
            icon: 'trash-outline',
            primaryLabel: t('delete'),
            primaryTone: 'destructive',
            onPrimary: async () => {
                setConfirmConfig(null);
                await deleteBudget(id);
                showSuccess(t('budgetDeleted'));
                loadData();
            },
            secondaryLabel: t('cancel'),
            onSecondary: () => setConfirmConfig(null),
        });
    };


    const getProgressColor = (level) => {
        if (level === 'critical') return colors.error;
        if (level === 'warning') return colors.warning;
        return colors.success;
    };

    const getAlertConfig = (item) => {
        if (item.level === 'critical') {
            return {
                title: t('budgetExceeded'),
                subtitle: t('budgetExceededHint').replace(
                    '{amount}',
                    `${getCurrencyInfo().symbol}${Math.ceil(item.spent).toFixed(0)}`
                ),
                color: colors.error,
            };
        }

        if (item.level === 'warning') {
            return {
                title: t('budgetWarningTitle'),
                subtitle: t('budgetWarningHint').replace(
                    '{amount}',
                    `${getCurrencyInfo().symbol}${Math.max(item.remaining, 0).toFixed(0)}`
                ),
                color: colors.warning,
            };
        }

        return null;
    };

    const budgetItems = Object.entries(budgets).map(([category, budget]) => {
        const spent = calculateSpent(category);
        const convertedLimit = convertedBudgets[category] || budget.limit;
        const progress = calculateProgress(spent, convertedLimit);
        const level = getAlertLevel(progress);
        const remaining = convertedLimit - spent;

        return {
            category,
            budget,
            spent,
            convertedLimit,
            progress,
            level,
            remaining,
        };
    });

    const levelRank = { critical: 0, warning: 1, safe: 2 };
    budgetItems.sort((a, b) => {
        const rankDiff = levelRank[a.level] - levelRank[b.level];
        if (rankDiff !== 0) return rankDiff;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return a.category.localeCompare(b.category);
    });

    const totalBudget = budgetItems.reduce((sum, item) => sum + item.convertedLimit, 0);
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const remainingLabel = totalRemaining >= 0 ? t('remaining') : t('exceeded');

    const loadBudgetAdvice = async () => {
        setAdviceLoading(true);
        try {
            const advice = await aiService.budgetAdvice();
            setBudgetAdvice(Array.isArray(advice) ? advice : []);
        } catch {
            showError(t('networkError'));
        } finally {
            setAdviceLoading(false);
        }
    };

    const applyAdvice = (item) => {
        setEditingBudget(null);
        setSelectedCategory(item.category);
        setLimitValue(String(Math.round(item.suggestedBudget || 0)));
        setShowModal(true);
    };

    const styles = createStyles(colors);

    if (loading && !refreshing) {
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
                    <Text style={styles.headerTitle}>{t('budgetGoals')}</Text>
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

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {Object.keys(budgets).length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="flag-outline" size={64} color={colors.textLight} />
                        <Text style={styles.emptyText}>{t('noBudgets')}</Text>
                        <Text style={styles.emptySubtext}>{t('addBudgetHint')}</Text>
                    </View>
                ) : (
                    <View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>{t('monthlySummary')}</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>{t('budgetTotal')}</Text>
                                    <Text style={styles.summaryValue}>
                                        {getCurrencyInfo().symbol}{totalBudget.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>{t('spent')}</Text>
                                    <Text style={styles.summaryValue}>
                                        {getCurrencyInfo().symbol}{totalSpent.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>{remainingLabel}</Text>
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            totalRemaining < 0 && styles.summaryValueNegative,
                                        ]}
                                    >
                                        {getCurrencyInfo().symbol}{Math.abs(totalRemaining).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {budgetItems.map((item) => {
                            const alertConfig = getAlertConfig(item);
                            return (
                                <TouchableOpacity
                                    key={item.category}
                                    activeOpacity={0.9}
                                    onPress={() => handleEditBudget(item.category, item.budget)}
                                    style={[
                                        styles.budgetCard,
                                        item.level === 'critical' && styles.budgetCardCritical,
                                        item.level === 'warning' && styles.budgetCardWarning,
                                    ]}
                                >
                                <View style={styles.budgetHeader}>
                                    <View style={styles.budgetLeft}>
                                        <CategoryIcon category={item.category} size={24} color={colors.primary} />
                                        <Text style={styles.budgetCategory}>{t(`categories.${item.category}`)}</Text>
                                    </View>
                                    <View style={styles.budgetRight}>
                                        <Text style={styles.budgetLimit}>
                                            {getCurrencyInfo().symbol}{item.convertedLimit.toFixed(0)}
                                        </Text>
                                        <View style={[
                                            styles.budgetPercentageBadge,
                                            { backgroundColor: getProgressColor(item.level) + '20' }
                                        ]}>
                                            <Text style={[
                                                styles.budgetPercentageText,
                                                { color: getProgressColor(item.level) }
                                            ]}>
                                                {item.progress.toFixed(0)}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.progressBarBg}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: `${Math.min(item.progress, 100)}%`,
                                                backgroundColor: getProgressColor(item.level),
                                            },
                                        ]}
                                    />
                                </View>

                                <View style={styles.budgetInfo}>
                                    <Text style={styles.budgetSpent}>
                                        {t('spent')}: {getCurrencyInfo().symbol}{item.spent.toFixed(2)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.budgetRemaining,
                                            item.remaining < 0 && { color: colors.error },
                                        ]}
                                    >
                                        {item.remaining >= 0 ? t('remaining') : t('exceeded')}: {getCurrencyInfo().symbol}
                                        {Math.abs(item.remaining).toFixed(2)}
                                    </Text>
                                </View>

                                {alertConfig && (
                                    <View style={[styles.budgetAlert, { backgroundColor: `${alertConfig.color}14` }]}>
                                        <Ionicons name="alert-circle-outline" size={16} color={alertConfig.color} />
                                        <View style={styles.budgetAlertText}>
                                            <Text style={[styles.budgetAlertTitle, { color: alertConfig.color }]}>
                                                {alertConfig.title}
                                            </Text>
                                            <Text style={styles.budgetAlertSubtitle}>
                                                {alertConfig.subtitle}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* AI Budget Advisor */}
                <View style={styles.advisorSection}>
                    <View style={styles.advisorHeader}>
                        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                        <Text style={styles.advisorTitle}>{t('aiBudgetAdvisor') || 'AI Budget Advisor'}</Text>
                    </View>
                    <Text style={styles.advisorHint}>
                        {t('aiBudgetAdvisorHint') || 'Get personalized budget limits based on your spending patterns.'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.advisorButton, adviceLoading && styles.advisorButtonDisabled]}
                        onPress={loadBudgetAdvice}
                        disabled={adviceLoading}
                        activeOpacity={0.8}
                    >
                        {adviceLoading
                            ? <ActivityIndicator size="small" color={colors.textWhite} />
                            : <>
                                <Ionicons name="bulb-outline" size={16} color={colors.textWhite} />
                                <Text style={styles.advisorButtonText}>{t('getAdvice') || 'Get advice'}</Text>
                            </>
                        }
                    </TouchableOpacity>

                    {Array.isArray(budgetAdvice) && budgetAdvice.map((item, i) => (
                        <View key={i} style={styles.adviceCard}>
                            <View style={styles.adviceLeft}>
                                <CategoryIcon category={item.category} size={20} color={colors.primary} />
                                <View style={styles.adviceInfo}>
                                    <Text style={styles.adviceCategory}>
                                        {t(`categories.${item.category}`) || item.category}
                                    </Text>
                                    <Text style={styles.adviceReason}>{item.reason}</Text>
                                    <Text style={styles.adviceMeta}>
                                        {t('current') || 'Current'}: {getCurrencyInfo().symbol}{(item.currentMonthlySpend || 0).toFixed(0)}
                                        {' → '}
                                        {t('suggested') || 'Suggested'}: {getCurrencyInfo().symbol}{(item.suggestedBudget || 0).toFixed(0)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.applyButton} onPress={() => applyAdvice(item)} activeOpacity={0.7}>
                                <Text style={styles.applyButtonText}>{t('apply') || 'Apply'}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {Array.isArray(budgetAdvice) && budgetAdvice.length === 0 && (
                        <Text style={styles.noAdviceText}>
                            {t('noAdviceAvailable') || 'No advice available. Add more expenses first.'}
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowModal(true)}
                    accessibilityLabel={t('addBudget')}
                    accessibilityRole="button"
                >
                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                    <Text style={styles.addButtonText}>{t('addBudget')}</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={handleCloseModal}>
                            <View style={styles.overlayTouchArea} />
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modal}>
                                <View style={styles.handleBar} />
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {editingBudget ? t('editBudget') : t('addBudget')}
                                    </Text>
                                    <TouchableOpacity onPress={handleCloseModal}>
                                        <Text style={styles.closeButton}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalContent}>
                                    <Text style={styles.label}>{t('selectCategory')}</Text>
                                    {editingBudget ? (
                                        <View style={styles.categoriesRow}>
                                            <View style={[styles.categoryOption, styles.categoryOptionActive]}>
                                                <CategoryIcon
                                                    category={editingBudget.category}
                                                    size={20}
                                                    color={colors.textWhite}
                                                />
                                                <Text style={[styles.categoryOptionText, { color: colors.textWhite }]}>
                                                    {t(`categories.${editingBudget.category}`)}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        <View style={styles.categoriesRow}>
                                            {CATEGORIES.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat}
                                                    style={[
                                                        styles.categoryOption,
                                                        selectedCategory === cat && styles.categoryOptionActive,
                                                    ]}
                                                    onPress={() => setSelectedCategory(cat)}
                                                >
                                                    <CategoryIcon
                                                        category={cat}
                                                        size={20}
                                                        color={selectedCategory === cat ? colors.textWhite : colors.primary}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.categoryOptionText,
                                                            selectedCategory === cat && { color: colors.textWhite },
                                                        ]}
                                                    >
                                                        {t(`categories.${cat}`)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                    )}

                                    <Text style={styles.label}>{t('monthlyLimit')}</Text>
                                    <View style={styles.amountContainer}>
                                        <Text style={styles.currencySymbol}>{getCurrencyInfo().symbol}</Text>
                                        <TextInput
                                            style={styles.amountInput}
                                            placeholder="0.00"
                                            placeholderTextColor={colors.textLight}
                                            value={limitValue}
                                            onChangeText={setLimitValue}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>

                                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveBudget}>
                                        <View style={styles.saveButtonContent}>
                                            <Ionicons name="save-outline" size={20} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                            <Text style={styles.saveButtonText}>{t('save')}</Text>
                                        </View>
                                    </TouchableOpacity>

                {editingBudget ? (
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => {
                                                handleCloseModal();
                                                handleDeleteBudget(editingBudget.id);
                                            }}
                                        >
                                            <View style={styles.deleteButtonContent}>
                                                <Ionicons name="trash-outline" size={20} color={colors.error} style={{ marginRight: spacing.sm }} />
                                                <Text style={styles.deleteButtonText}>{t('deleteBudget')}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <ConfirmSheet
                visible={!!confirmConfig}
                onClose={() => setConfirmConfig(null)}
                {...confirmConfig}
            />
        </View>
    );
}
