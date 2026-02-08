import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { CATEGORIES, normalizeCategory } from '../constants/categories';
import CategoryIcon from '../components/CategoryIcon';
import { getBudgets, saveBudget, deleteBudget, calculateProgress, getAlertLevel } from '../utils/budgets';
import currencyService from '../services/currency';
import { filterByThisMonth } from '../utils/helpers';
import { expenseService } from '../services/api';

export default function BudgetsScreen() {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();

    const [budgets, setBudgets] = useState({});
    const [expenses, setExpenses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [limitValue, setLimitValue] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [convertedBudgets, setConvertedBudgets] = useState({});
    const [convertedSpent, setConvertedSpent] = useState({});
    const [editingBudget, setEditingBudget] = useState(null);

    useEffect(() => {
        loadData();
    }, [currency]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const loadData = async () => {
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
    };

    const calculateSpent = (category) => {
        return convertedSpent[category] || 0;
    };

    const handleSaveBudget = async () => {
        if (!selectedCategory || !limitValue || isNaN(parseFloat(limitValue)) || parseFloat(limitValue) <= 0) {
            Alert.alert(t('attention'), t('enterLimit'));
            return;
        }

        const success = await saveBudget(selectedCategory, parseFloat(limitValue), currency);

        if (success) {
            Alert.alert(t('success'), editingBudget ? t('budgetUpdated') : t('budgetSaved'));
            setShowModal(false);
            setSelectedCategory('');
            setLimitValue('');
            setEditingBudget(null);
            setTimeout(() => loadData(), 500);
        }
    };

    const handleEditBudget = (category, budget) => {
        const convertedLimit = convertedBudgets[category] || budget.limit;
        setEditingBudget({ category, limit: convertedLimit, currency: budget.currency });
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

    const handleDeleteBudget = (category) => {
        Alert.alert(
            t('attention'),
            t('deleteBudget') + '?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await deleteBudget(category);
                        Alert.alert(t('success'), t('budgetDeleted'));
                        loadData();
                    },
                },
            ]
        );
    };

    const getProgressColor = (level) => {
        if (level === 'critical') return '#F44336';
        if (level === 'warning') return '#FF9800';
        return '#4CAF50';
    };

    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>{t('budgetGoals')}</Text>
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
                    <SwipeListView
                        data={Object.entries(budgets).map(([category, budget]) => ({
                            key: category,
                            category,
                            budget,
                        }))}
                        scrollEnabled={false}
                        renderItem={({ item }) => {
                            const { category, budget } = item;
                            const spent = calculateSpent(category);
                            const convertedLimit = convertedBudgets[category] || budget.limit;
                            const progress = calculateProgress(spent, convertedLimit);
                            const level = getAlertLevel(progress);
                            const remaining = convertedLimit - spent;

                            return (
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => handleEditBudget(category, budget)}
                                    style={styles.budgetCard}
                                >
                                    <View style={styles.budgetHeader}>
                                        <View style={styles.budgetLeft}>
                                            <CategoryIcon category={category} size={24} color={colors.primary} />
                                            <Text style={styles.budgetCategory}>{t(`categories.${category}`)}</Text>
                                        </View>
                                        <View style={styles.budgetRight}>
                                            <Text style={styles.budgetLimit}>
                                                {getCurrencyInfo().symbol}{convertedLimit.toFixed(0)}
                                            </Text>
                                            <View style={[
                                                styles.budgetPercentageBadge,
                                                { backgroundColor: getProgressColor(level) + '20' }
                                            ]}>
                                                <Text style={[
                                                    styles.budgetPercentageText,
                                                    { color: getProgressColor(level) }
                                                ]}>
                                                    {progress.toFixed(0)}%
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                {
                                                    width: `${Math.min(progress, 100)}%`,
                                                    backgroundColor: getProgressColor(level),
                                                },
                                            ]}
                                        />
                                    </View>

                                    <View style={styles.budgetInfo}>
                                        <Text style={styles.budgetSpent}>
                                            {t('spent')}: {getCurrencyInfo().symbol}{spent.toFixed(2)}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.budgetRemaining,
                                                remaining < 0 && { color: '#F44336' },
                                            ]}
                                        >
                                            {remaining >= 0 ? t('remaining') : t('exceeded')}:{' '}
                                            {getCurrencyInfo().symbol}{Math.abs(remaining).toFixed(2)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        renderHiddenItem={({ item }) => (
                            <View style={styles.swipeHiddenRow}>
                                <TouchableOpacity
                                    style={styles.swipeEditButton}
                                    onPress={() => handleEditBudget(item.category, item.budget)}
                                >
                                    <Ionicons name="create-outline" size={24} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.swipeDeleteButton}
                                    onPress={() => handleDeleteBudget(item.category)}
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

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowModal(true)}
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
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </KeyboardAvoidingView>
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
        header: {
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.xl,
            borderBottomLeftRadius: borderRadius.xxl,
            borderBottomRightRadius: borderRadius.xxl,
        },
        headerTitle: {
            fontSize: fontSize.xxxl,
            fontFamily: fontFamily.bold,
            color: colors.textWhite,
        },
        content: {
            flex: 1,
            paddingTop: spacing.xl,
        },
        emptyState: {
            alignItems: 'center',
            paddingVertical: spacing.xxxl * 2,
        },
        emptyText: {
            fontSize: fontSize.xl,
            fontFamily: fontFamily.bold,
            color: colors.text,
            marginBottom: spacing.sm,
            marginTop: spacing.lg,
        },
        emptySubtext: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
            textAlign: 'center',
        },
        budgetCard: {
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            ...shadows.medium,
        },
        budgetHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
        },
        budgetLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        budgetCategory: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: colors.text,
            marginLeft: spacing.sm,
        },
        budgetRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        budgetLimit: {
            fontSize: fontSize.xl,
            fontFamily: fontFamily.bold,
            color: colors.primary,
        },
        budgetPercentageBadge: {
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.md,
        },
        budgetPercentageText: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
        },
        progressBarBg: {
            height: 10,
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
            overflow: 'hidden',
            marginBottom: spacing.md,
        },
        progressBar: {
            height: '100%',
            borderRadius: borderRadius.full,
        },
        budgetInfo: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        budgetSpent: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        budgetRemaining: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        swipeHiddenRow: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginHorizontal: spacing.xl,
            marginBottom: spacing.lg,
        },
        swipeEditButton: {
            backgroundColor: colors.primary,
            width: 70,
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            borderTopLeftRadius: borderRadius.lg,
            borderBottomLeftRadius: borderRadius.lg,
        },
        swipeDeleteButton: {
            backgroundColor: colors.error || '#F44336',
            width: 70,
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            borderTopRightRadius: borderRadius.lg,
            borderBottomRightRadius: borderRadius.lg,
        },
        addButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: colors.primary,
        },
        addButtonText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
            marginLeft: spacing.sm,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
        modal: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: borderRadius.xxxl,
            borderTopRightRadius: borderRadius.xxxl,
            maxHeight: '80%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        modalTitle: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        closeButton: {
            fontSize: fontSize.huge,
            color: colors.textLight,
            fontWeight: fontWeight.light,
        },
        modalContent: {
            padding: spacing.xl,
        },
        label: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.sm,
            marginTop: spacing.lg,
        },
        categoriesRow: {
            flexDirection: 'row',
            gap: spacing.sm,
        },
        categoryOption: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
        },
        categoryOptionActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        categoryOptionText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.text,
            marginLeft: spacing.xs,
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            paddingLeft: spacing.lg,
        },
        currencySymbol: {
            fontSize: fontSize.xl,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
            marginRight: spacing.sm,
        },
        amountInput: {
            flex: 1,
            padding: spacing.lg,
            fontSize: fontSize.xl,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        saveButton: {
            backgroundColor: colors.primary,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            alignItems: 'center',
            marginTop: spacing.xl,
            ...shadows.colored,
        },
        saveButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        saveButtonText: {
            color: colors.textWhite,
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
        },
    });
