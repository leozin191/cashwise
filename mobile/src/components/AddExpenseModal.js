import {useEffect, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { expenseService } from '../services/api';
import { CATEGORIES, getCategoryEmoji, getCategoryColor } from '../constants/categories';
import { CURRENCIES } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getBudgets, calculateProgress, getAlertLevel } from '../utils/budgets';
import { filterByThisMonth } from '../utils/helpers';
import CategoryIcon from './CategoryIcon';
import { useTheme } from '../contexts/ThemeContext';

export default function AddExpenseModal({ visible, onClose, onSuccess, expenseToEdit = null }) {
    const { t } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [description, setDescription] = useState(expenseToEdit?.description || '');
    const [amount, setAmount] = useState(expenseToEdit?.amount?.toString() || '');
    const [category, setCategory] = useState(expenseToEdit?.category || '');
    const [saving, setSaving] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(expenseToEdit?.currency || currency);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (expenseToEdit) {
            setDescription(expenseToEdit.description);
            setAmount(expenseToEdit.amount.toString());
            setCategory(expenseToEdit.category || '');
            setSelectedCurrency(expenseToEdit.currency || currency);
        }
    }, [expenseToEdit, currency]);


    const checkBudgetAlert = async (expense) => {
        try {
            const budgets = await getBudgets();
            const expenseCategory = expense.category;

            if (!budgets[expenseCategory]) return; // Sem meta para esta categoria

            // Pega todas as despesas do mês
            const allExpenses = await expenseService.getAll();
            const thisMonth = filterByThisMonth(allExpenses);

            // Calcula total da categoria
            const categoryTotal = thisMonth
                .filter(exp => exp.category === expenseCategory)
                .reduce((sum, exp) => sum + exp.amount, 0);

            const budget = budgets[expenseCategory];
            const progress = calculateProgress(categoryTotal, budget.limit);
            const level = getAlertLevel(progress);

            // Alerta se passou de 80%
            if (level === 'warning') {
                setTimeout(() => {
                    Alert.alert(
                        `⚠️ ${t('budgetWarning')} ${progress.toFixed(0)}%`,
                        `${t(`categories.${expenseCategory}`)}: €${categoryTotal.toFixed(2)} de €${budget.limit.toFixed(0)}`,
                        [{ text: 'OK' }]
                    );
                }, 1000);
            } else if (level === 'critical') {
                setTimeout(() => {
                    Alert.alert(
                        `🚨 ${t('budgetCritical')}`,
                        `${t(`categories.${expenseCategory}`)}: €${categoryTotal.toFixed(2)} de €${budget.limit.toFixed(0)}`,
                        [{ text: 'OK' }]
                    );
                }, 1000);
            }
        } catch (error) {
            console.error('Error checking budget:', error);
        }
    };

    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert(t('attention'), t('enterDescription'));
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert(t('attention'), t('enterValidAmount'));
            return;
        }

        try {
            setSaving(true);
            const expenseData = {
                description: description.trim(),
                amount: parseFloat(amount),
                currency: selectedCurrency,
                date: expenseToEdit?.date || new Date().toISOString().split('T')[0],
                ...(category && { category }),
            };

            if (expenseToEdit) {
                await expenseService.update(expenseToEdit.id, expenseData);
                Alert.alert(`✅ ${t('success')}`, t('expenseUpdated'), [
                    { text: 'OK', onPress: handleClose }
                ]);
            } else {
                const result = await expenseService.create(expenseData);

                // Verifica metas de gastos
                await checkBudgetAlert(result);

                if (!category && result.category) {
                    Alert.alert(
                        `✨ ${t('success')}`,
                        `${t('expenseAdded')}\n${t('aiCategorized')} ${t(`categories.${result.category}`)}`,
                        [{ text: 'OK', onPress: handleClose }]
                    );
                } else {
                    Alert.alert(`✅ ${t('success')}`, t('expenseAdded'), [
                        { text: 'OK', onPress: handleClose }
                    ]);
                }
            }

            onSuccess();
        } catch (error) {
            Alert.alert(t('error'), t('couldNotSave'));
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setAmount('');
        setCategory('');
        setShowAdvanced(false);
        setShowCurrencyPicker(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {expenseToEdit ? t('editExpense') : t('newExpense')}
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Conteúdo */}
                    <ScrollView style={styles.content}>
                        {/* Banner da IA */}
                        <View style={styles.aiBanner}>
                            <Text style={styles.aiBannerEmoji}>✨</Text>
                            <Text style={styles.aiBannerText}>
                                {t('aiBanner')}
                            </Text>
                        </View>

                        {/* Campo Descrição */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('description')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('descriptionPlaceholder')}
                                placeholderTextColor={colors.textLighter}
                                value={description}
                                onChangeText={setDescription}
                                autoFocus
                            />
                        </View>

                        {/* Campo Valor */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('amount')}</Text>
                            <View style={styles.amountContainer}>
                                <Text style={styles.currencySymbol}>
                                    {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || getCurrencyInfo().symbol}
                                </Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textLighter}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>

                        {/* Categorias */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('categoryOptional')}</Text>
                            <View style={styles.categoriesGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            category === cat && {
                                                backgroundColor: getCategoryColor(cat),
                                                borderColor: getCategoryColor(cat),
                                            },
                                        ]}
                                        onPress={() => setCategory(category === cat ? '' : cat)}
                                    >
                                        <View style={[
                                            styles.categoryIconWrapper,
                                            category === cat && styles.categoryIconWrapperSelected
                                        ]}>
                                            <CategoryIcon
                                                category={cat}
                                                size={18}
                                                color={category === cat ? colors.textWhite : colors.primary}
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                styles.categoryText,
                                                category === cat && styles.categoryTextSelected,
                                            ]}
                                        >
                                            {t(`categories.${cat}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Opções Avançadas */}
                        <TouchableOpacity
                            style={styles.advancedToggle}
                            onPress={() => setShowAdvanced(!showAdvanced)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.advancedToggleText}>
                                ⚙️ Opções avançadas
                            </Text>
                            <Text style={styles.advancedToggleArrow}>
                                {showAdvanced ? '▲' : '▼'}
                            </Text>
                        </TouchableOpacity>

                        {/* Seção Avançada (expandível) */}
                        {showAdvanced && (
                            <View style={styles.advancedSection}>
                                {/* Moeda */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>💱 {t('currency')}</Text>
                                    <TouchableOpacity
                                        style={styles.currencySelector}
                                        onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                                    >
                                        <Text style={styles.currencySelectorText}>
                                            {CURRENCIES.find(c => c.code === selectedCurrency)?.flag} {selectedCurrency} - {CURRENCIES.find(c => c.code === selectedCurrency)?.name}
                                        </Text>
                                        <Text style={styles.currencySelectorArrow}>▼</Text>
                                    </TouchableOpacity>

                                    {showCurrencyPicker && (
                                        <ScrollView style={styles.currencyDropdown} nestedScrollEnabled={true}>
                                            {CURRENCIES.map((curr) => (
                                                <TouchableOpacity
                                                    key={curr.code}
                                                    style={[
                                                        styles.currencyOption,
                                                        selectedCurrency === curr.code && styles.currencyOptionActive
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedCurrency(curr.code);
                                                        setShowCurrencyPicker(false);
                                                    }}
                                                >
                                                    <Text style={styles.currencyOptionFlag}>{curr.flag}</Text>
                                                    <Text style={styles.currencyOptionText}>
                                                        {curr.code} - {curr.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>

                                {/* Informação sobre moeda padrão */}
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoText}>
                                        ℹ️ Por padrão, despesas são salvas em {CURRENCIES.find(c => c.code === currency)?.flag} {currency}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Botão Salvar */}
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving
                                    ? t('saving')
                                    : expenseToEdit
                                        ? `💾 ${t('saveChanges')}`
                                        : `✨ ${t('addExpense')}`
                                }
                            </Text>
                        </TouchableOpacity>
                        {/* Espaço extra quando avançado está aberto */}
                        {showAdvanced && showCurrencyPicker && (
                            <View style={{ height: 200 }} />
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxxl,
        borderTopRightRadius: borderRadius.xxxl,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    closeButton: {
        fontSize: fontSize.huge,
        color: colors.textLight,
        fontWeight: fontWeight.light,
    },
    content: {
        padding: spacing.xl,
    },
    aiBanner: {
        flexDirection: 'row',
        backgroundColor: colors.primaryBg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xxl,
        alignItems: 'center',
    },
    aiBannerEmoji: {
        fontSize: fontSize.xxxl,
        marginRight: spacing.md,
    },
    aiBannerText: {
        flex: 1,
        fontSize: fontSize.sm + 1,
        color: colors.primary,
        lineHeight: 18,
    },
    inputGroup: {
        marginBottom: spacing.xxl,
    },
    label: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        fontSize: fontSize.lg,
        color: colors.text,
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
        fontSize: fontSize.xl + 2,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
        marginRight: spacing.sm,
    },
    amountInput: {
        flex: 1,
        padding: spacing.lg,
        fontSize: fontSize.xl + 2,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    categoryIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primaryBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    categoryIconWrapperSelected: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    categoryText: {
        fontSize: fontSize.sm + 1,
        color: colors.textLight,
        fontWeight: fontWeight.medium,
    },
    categoryTextSelected: {
        color: colors.textWhite,
        fontWeight: fontWeight.semibold,
    },
    saveButton: {
        backgroundColor: colors.primary,
        padding: spacing.xl - 2,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xxxl,
        ...shadows.colored,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: colors.textWhite,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
    },
    currencySelector: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currencySelectorText: {
        fontSize: fontSize.lg,
        color: colors.text,
        fontWeight: fontWeight.semibold,
    },
    currencySelectorArrow: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    currencyDropdown: {
        marginTop: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 180,
        ...shadows.large,
    },
    currencyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    currencyOptionActive: {
        backgroundColor: colors.primaryBg,
    },
    currencyOptionFlag: {
        fontSize: fontSize.xl,
        marginRight: spacing.sm,
    },
    currencyOptionText: {
        fontSize: fontSize.sm,
        color: colors.text,
    },
    advancedToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    advancedToggleText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.textLight,
    },
    advancedToggleArrow: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    advancedSection: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    infoBox: {
        backgroundColor: colors.primaryBg,
        padding: spacing.md,
        borderRadius: borderRadius.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    infoText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        lineHeight: 18,
    },
});