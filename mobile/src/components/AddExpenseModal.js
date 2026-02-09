import {useEffect, useRef, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    Alert,
    Platform,
    Animated,
    PanResponder,
    Dimensions,
    Keyboard,
    Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { expenseService } from '../services/api';
import { CATEGORIES, getCategoryColor } from '../constants/categories';
import { CURRENCIES } from '../constants/currencies';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getBudgets, calculateProgress, getAlertLevel } from '../utils/budgets';
import { filterByThisMonth } from '../utils/helpers';
import CategoryIcon from './CategoryIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function AddExpenseModal({
    visible,
    onClose,
    onSuccess,
    expenseToEdit = null,
    installmentGroupToEdit = null,
    prefillExpense = null,
}) {
    const { t, language } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();
    const { colors } = useTheme();
    const { showSuccess } = useSnackbar();
    const styles = createStyles(colors);

    const [description, setDescription] = useState(expenseToEdit?.description || '');
    const [amount, setAmount] = useState(expenseToEdit?.amount?.toString() || '');
    const [category, setCategory] = useState(expenseToEdit?.category || '');
    const [saving, setSaving] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(expenseToEdit?.currency || currency);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
        expenseToEdit?.date ? new Date(expenseToEdit.date) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentCount, setInstallmentCount] = useState(2);

    const translateY = useRef(new Animated.Value(0)).current;
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const DISMISS_THRESHOLD = 100;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => {
                return gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
            },
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    translateY.setValue(gesture.dy);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.5) {
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        handleClose();
                        setTimeout(() => translateY.setValue(0), 100);
                    });
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 8,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (expenseToEdit) {
            setDescription(expenseToEdit.description);
            setAmount(expenseToEdit.amount.toString());
            setCategory(expenseToEdit.category || '');
            setSelectedCurrency(expenseToEdit.currency || currency);
            setSelectedDate(expenseToEdit.date ? new Date(expenseToEdit.date) : new Date());
        }
    }, [expenseToEdit, currency]);

    useEffect(() => {
        if (expenseToEdit || !installmentGroupToEdit) return;
        if (!Array.isArray(installmentGroupToEdit) || installmentGroupToEdit.length === 0) return;

        const totalCount = Math.max(
            ...installmentGroupToEdit.map((item) => item._installmentTotal || 0),
            installmentGroupToEdit.length
        );
        const totalAmount = installmentGroupToEdit.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const firstDate = installmentGroupToEdit.reduce((min, item) => {
            const current = new Date(item.date);
            return current < min ? current : min;
        }, new Date(installmentGroupToEdit[0].date));
        const baseDescription = installmentGroupToEdit[0]?.description
            ?.replace(/\s*\(\d+\/\d+\)$/, '')
            .trim();
        const firstCurrency = installmentGroupToEdit[0]?.currency || currency;
        const groupCategory = installmentGroupToEdit.every((item) => item.category === installmentGroupToEdit[0].category)
            ? (installmentGroupToEdit[0].category || '')
            : '';

        setDescription(baseDescription || '');
        setAmount(totalAmount.toFixed(2));
        setCategory(groupCategory);
        setSelectedCurrency(firstCurrency);
        setSelectedDate(firstDate);
        setIsInstallment(true);
        setInstallmentCount(totalCount);
    }, [expenseToEdit, installmentGroupToEdit, currency]);

    useEffect(() => {
        if (expenseToEdit || installmentGroupToEdit || !prefillExpense) return;
        setDescription(prefillExpense.description || '');
        setAmount(prefillExpense.amount ? prefillExpense.amount.toString() : '');
        setCategory(prefillExpense.category || '');
        setSelectedCurrency(prefillExpense.currency || currency);
        setSelectedDate(new Date());
        setIsInstallment(false);
        setInstallmentCount(2);
    }, [expenseToEdit, installmentGroupToEdit, prefillExpense, currency]);

    const checkBudgetAlert = async (expense) => {
        try {
            const budgets = await getBudgets();
            const expenseCategory = expense.category;

            if (!budgets[expenseCategory]) return;

            const allExpenses = await expenseService.getAll();
            const thisMonth = filterByThisMonth(allExpenses);

            const categoryTotal = thisMonth
                .filter(exp => exp.category === expenseCategory)
                .reduce((sum, exp) => sum + exp.amount, 0);

            const budget = budgets[expenseCategory];
            const progress = calculateProgress(categoryTotal, budget.limit);
            const level = getAlertLevel(progress);

            if (level === 'warning') {
                setTimeout(() => {
                    Alert.alert(
                        `${t('budgetWarning')} ${progress.toFixed(0)}%`,
                        `${t(`categories.${expenseCategory}`)}: €${categoryTotal.toFixed(2)} de €${budget.limit.toFixed(0)}`,
                        [{ text: 'OK' }]
                    );
                }, 1000);
            } else if (level === 'critical') {
                setTimeout(() => {
                    Alert.alert(
                        t('budgetCritical'),
                        `${t(`categories.${expenseCategory}`)}: €${categoryTotal.toFixed(2)} de €${budget.limit.toFixed(0)}`,
                        [{ text: 'OK' }]
                    );
                }, 1000);
            }
        } catch (error) {
            console.error('Error checking budget:', error);
        }
    };

    const splitInstallments = (total, count) => {
        const totalCents = Math.round(total * 100);
        const baseCents = Math.floor(totalCents / count);
        const remainder = totalCents % count;
        return Array.from({ length: count }, (_, index) => (
            (baseCents + (index < remainder ? 1 : 0)) / 100
        ));
    };

    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert(t('attention'), t('enterDescription'));
            return;
        }
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert(t('attention'), t('enterValidAmount'));
            return;
        }

        try {
            setSaving(true);

            if (installmentGroupToEdit && isInstallment && installmentCount > 1) {
                const baseDate = new Date(selectedDate);
                const totalAmount = parseFloat(amount);
                const idsToDelete = installmentGroupToEdit.map((item) => item.id).filter(Boolean);
                const installments = splitInstallments(totalAmount, installmentCount);

                if (idsToDelete.length === 0) {
                    Alert.alert(t('error'), t('couldNotSave'));
                    return;
                }

                const deleteResults = await Promise.allSettled(
                    idsToDelete.map((expenseId) => expenseService.delete(expenseId))
                );
                const deleteFailed = deleteResults.some((result) => result.status === 'rejected');
                if (deleteFailed) {
                    Alert.alert(t('error'), t('couldNotDelete'));
                    return;
                }

                for (let i = 0; i < installmentCount; i++) {
                    const parcelDate = new Date(baseDate);
                    parcelDate.setMonth(parcelDate.getMonth() + i);
                    const parcelData = {
                        description: `${description.trim()} (${i + 1}/${installmentCount})`,
                        amount: installments[i],
                        currency: selectedCurrency,
                        date: parcelDate.toISOString().split('T')[0],
                        ...(category && { category }),
                    };

                    const result = await expenseService.create(parcelData);

                    if (i === 0) {
                        await checkBudgetAlert(result);
                    }
                }

                showSuccess(t('installmentsUpdated'));
                handleClose();
            } else if (!expenseToEdit && isInstallment && installmentCount > 1) {
                const baseDate = new Date(selectedDate);
                const totalAmount = parseFloat(amount);
                const installments = splitInstallments(totalAmount, installmentCount);

                for (let i = 0; i < installmentCount; i++) {
                    const parcelDate = new Date(baseDate);
                    parcelDate.setMonth(parcelDate.getMonth() + i);

                    const parcelData = {
                        description: `${description.trim()} (${i + 1}/${installmentCount})`,
                        amount: installments[i],
                        currency: selectedCurrency,
                        date: parcelDate.toISOString().split('T')[0],
                        ...(category && { category }),
                    };

                    const result = await expenseService.create(parcelData);

                    if (i === 0) {
                        await checkBudgetAlert(result);
                    }
                }

                showSuccess(`${installmentCount} ${t('installmentsCreated')}`);
                handleClose();
            } else {
                const expenseData = {
                    description: description.trim(),
                    amount: parseFloat(amount),
                    currency: selectedCurrency,
                    date: selectedDate.toISOString().split('T')[0],
                    ...(category && { category }),
                };

                if (expenseToEdit) {
                    await expenseService.update(expenseToEdit.id, expenseData);
                    showSuccess(t('expenseUpdated'));
                    handleClose();
                } else {
                    const result = await expenseService.create(expenseData);

                    await checkBudgetAlert(result);

                    if (!category && result.category) {
                        showSuccess(
                            `${t('expenseAdded')} ${t('aiCategorized')} ${t(`categories.${result.category}`)}`
                        );
                    } else {
                        showSuccess(t('expenseAdded'));
                    }
                    handleClose();
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
        Keyboard.dismiss();
        setDescription('');
        setAmount('');
        setCategory('');
        setShowAdvanced(false);
        setShowCurrencyPicker(false);
        setSelectedDate(new Date());
        setShowDatePicker(false);
        setIsInstallment(false);
        setInstallmentCount(2);
        translateY.setValue(0);
        onClose();
    };

    const parsedAmount = parseFloat(amount);
    const hasValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;
    const installmentAmounts = hasValidAmount ? splitInstallments(parsedAmount, installmentCount) : [];
    const firstInstallmentAmount = installmentAmounts[0] || 0;
    const lastInstallmentAmount = installmentAmounts[installmentAmounts.length - 1] || 0;
    const isInstallmentLocked = !!installmentGroupToEdit;
    const currencyFlag = CURRENCIES.find((curr) => curr.code === currency)?.flag || '';
    const defaultCurrencyTemplate = t('defaultCurrencyInfo');
    const defaultCurrencyInfoText = (
        defaultCurrencyTemplate === 'defaultCurrencyInfo'
            ? `Default currency: ${currencyFlag} ${currency}`
            : defaultCurrencyTemplate.replace('{flag}', currencyFlag).replace('{code}', currency)
    ).replace(/\s{2,}/g, ' ').trim();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.overlayTouchArea} />
                </TouchableWithoutFeedback>
                <Animated.View style={[styles.modal, { transform: [{ translateY }] }]}>
                    {/* Drag Handle */}
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {expenseToEdit
                                ? t('editExpense')
                                : installmentGroupToEdit
                                    ? t('editInstallments')
                                    : t('newExpense')}
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Conteúdo */}
                    <ScrollView style={styles.content}>
                        {/* Banner da IA */}
                        <View style={styles.aiBanner}>
                            <Ionicons name="flash-outline" size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
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
                                maxLength={200}
                                autoFocus
                            />
                        </View>

                        {/* Campo Valor */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                {isInstallment ? t('totalValue') : t('amount')}
                            </Text>
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

                        {/* Data */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('date')}</Text>
                            <TouchableOpacity
                                style={styles.dateSelector}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.dateSelectorText}>
                                    {selectedDate.toLocaleDateString(
                                        language === 'pt' ? 'pt-BR' : 'en-US',
                                        { day: '2-digit', month: 'long', year: 'numeric' }
                                    )}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                    maximumDate={new Date()}
                                    onChange={(event, date) => {
                                        if (Platform.OS === 'android') {
                                            setShowDatePicker(false);
                                        }
                                        if (date) {
                                            setSelectedDate(date);
                                        }
                                    }}
                                />
                            )}
                        </View>

                        {/* Parcelamento — only in create mode */}
                        {!expenseToEdit && (
                            <View style={styles.inputGroup}>
                                <View style={styles.installmentToggleRow}>
                                    <View style={styles.installmentToggleLabel}>
                                        <Ionicons name="card-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                                        <Text style={styles.label}>{t('installment')}</Text>
                                    </View>
                                    <Switch
                                        value={isInstallmentLocked ? true : isInstallment}
                                        onValueChange={setIsInstallment}
                                        disabled={isInstallmentLocked}
                                        trackColor={{ false: colors.border, true: colors.primary + '60' }}
                                        thumbColor={(isInstallmentLocked || isInstallment) ? colors.primary : colors.textLight}
                                    />
                                </View>
                                {isInstallment && (
                                    <View style={styles.installmentSection}>
                                        <Text style={styles.installmentSectionLabel}>{t('numberOfInstallments')}</Text>
                                        <View style={styles.installmentCounter}>
                                            <TouchableOpacity
                                                style={[styles.installmentBtn, installmentCount <= 2 && styles.installmentBtnDisabled]}
                                                onPress={() => setInstallmentCount(Math.max(2, installmentCount - 1))}
                                                disabled={installmentCount <= 2}
                                            >
                                                <Ionicons name="remove" size={20} color={installmentCount <= 2 ? colors.textLighter : colors.primary} />
                                            </TouchableOpacity>
                                            <Text style={styles.installmentCountText}>{installmentCount}×</Text>
                                            <TouchableOpacity
                                                style={[styles.installmentBtn, installmentCount >= 48 && styles.installmentBtnDisabled]}
                                                onPress={() => setInstallmentCount(Math.min(48, installmentCount + 1))}
                                                disabled={installmentCount >= 48}
                                            >
                                                <Ionicons name="add" size={20} color={installmentCount >= 48 ? colors.textLighter : colors.primary} />
                                            </TouchableOpacity>
                                        </View>
                                        {hasValidAmount && (
                                            <View style={styles.installmentInfo}>
                                                <Text style={styles.installmentInfoText}>
                                                    {t('installmentValue')}: {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || '€'}
                                                    {firstInstallmentAmount.toFixed(2)}
                                                    {firstInstallmentAmount !== lastInstallmentAmount
                                                        ? ` - ${lastInstallmentAmount.toFixed(2)}`
                                                        : ''}
                                                </Text>
                                                <Text style={styles.installmentTotalText}>
                                                    {t('totalValue')}: {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || '€'}{parsedAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

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
                            <View style={styles.advancedToggleContent}>
                                <Ionicons name="settings-outline" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.advancedToggleText}>
                                    {t('advancedOptions') || 'Advanced options'}
                                </Text>
                            </View>
                            <Text style={styles.advancedToggleArrow}>
                                {showAdvanced ? '▲' : '▼'}
                            </Text>
                        </TouchableOpacity>

                        {/* Seção Avançada (expandível) */}
                        {showAdvanced && (
                            <View style={styles.advancedSection}>
                                {/* Moeda */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.currencyLabelRow}>
                                        <Ionicons name="swap-horizontal-outline" size={16} color={colors.text} style={{ marginRight: spacing.sm }} />
                                        <Text style={styles.label}>{t('currency')}</Text>
                                    </View>
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
                                    <View style={styles.infoBoxContent}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
                                        <Text style={styles.infoText}>
                                            {defaultCurrencyInfoText}
                                        </Text>
                                    </View>
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
                            <View style={styles.saveButtonContent}>
                                <Ionicons
                                    name={expenseToEdit ? 'save-outline' : 'add-circle-outline'}
                                    size={22}
                                    color={colors.textWhite}
                                    style={{ marginRight: spacing.sm }}
                                />
                                <Text style={styles.saveButtonText}>
                                    {saving
                                        ? (isInstallment && !expenseToEdit && !installmentGroupToEdit
                                            ? t('creatingInstallments')
                                            : t('saving'))
                                        : (expenseToEdit || installmentGroupToEdit)
                                            ? t('saveChanges')
                                            : isInstallment
                                                ? `${t('addExpense')} (${installmentCount}×)`
                                                : t('addExpense')
                                    }
                                </Text>
                            </View>
                        </TouchableOpacity>
                        {/* Espaço extra quando avançado está aberto */}
                        {showAdvanced && showCurrencyPicker && (
                            <View style={{ height: 200 }} />
                        )}
                    </ScrollView>
                </Animated.View>
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
        fontFamily: fontFamily.bold,
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
    aiBannerText: {
        flex: 1,
        fontSize: fontSize.sm + 1,
        fontFamily: fontFamily.regular,
        color: colors.primary,
        lineHeight: 18,
    },
    inputGroup: {
        marginBottom: spacing.xxl,
    },
    label: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
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
        fontFamily: fontFamily.regular,
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
        fontFamily: fontFamily.semibold,
        color: colors.primary,
        marginRight: spacing.sm,
    },
    amountInput: {
        flex: 1,
        padding: spacing.lg,
        fontSize: fontSize.xl + 2,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
    },
    dateSelectorText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.semibold,
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
        fontFamily: fontFamily.medium,
        color: colors.textLight,
    },
    categoryTextSelected: {
        color: colors.textWhite,
        fontFamily: fontFamily.semibold,
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
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    saveButtonText: {
        color: colors.textWhite,
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
    },
    currencyLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
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
        fontFamily: fontFamily.semibold,
        color: colors.text,
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
        fontFamily: fontFamily.regular,
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
    advancedToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    advancedToggleText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
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
    infoBoxContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.primary,
        lineHeight: 18,
    },
    installmentToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    installmentToggleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    installmentSection: {
        marginTop: spacing.lg,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
    },
    installmentSectionLabel: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
        color: colors.textLight,
        marginBottom: spacing.md,
    },
    installmentCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    installmentBtn: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primaryBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    installmentBtnDisabled: {
        opacity: 0.4,
    },
    installmentCountText: {
        fontSize: fontSize.xxxl,
        fontFamily: fontFamily.bold,
        color: colors.primary,
        minWidth: 50,
        textAlign: 'center',
    },
    installmentInfo: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.xs,
    },
    installmentInfoText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    installmentTotalText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.primary,
    },
});
