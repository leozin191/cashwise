import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { expenseService, aiService } from '../services/api';
import * as Haptics from 'expo-haptics';
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
    const [suggestion, setSuggestion] = useState('');
    const [saving, setSaving] = useState(false);
    const suggestionTimer = useRef(null);
    const [showNlInput, setShowNlInput] = useState(false);
    const [nlText, setNlText] = useState('');
    const [nlLoading, setNlLoading] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(expenseToEdit?.currency || currency);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedDate, setSelectedDate] = useState(
        expenseToEdit?.date ? new Date(expenseToEdit.date) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentCount, setInstallmentCount] = useState(2);

    const safeInstallmentGroup = useMemo(() => (
        Array.isArray(installmentGroupToEdit) ? installmentGroupToEdit.filter(Boolean) : null
    ), [installmentGroupToEdit]);

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
        if (expenseToEdit || !safeInstallmentGroup || safeInstallmentGroup.length === 0) return;

        const totalCount = Math.max(
            ...safeInstallmentGroup.map((item) => item._installmentTotal || 0),
            safeInstallmentGroup.length
        );
        const totalAmount = safeInstallmentGroup.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const firstDate = safeInstallmentGroup.reduce((min, item) => {
            const current = new Date(item.date);
            return current < min ? current : min;
        }, new Date(safeInstallmentGroup[0].date));
        const baseDescription = safeInstallmentGroup[0]?.description
            ?.replace(/\s*\(\d+\/\d+\)$/, '')
            .trim();
        const firstCurrency = safeInstallmentGroup[0]?.currency || currency;
        const groupCategory = safeInstallmentGroup.every((item) => item.category === safeInstallmentGroup[0].category)
            ? (safeInstallmentGroup[0].category || '')
            : '';

        setDescription(baseDescription || '');
        setAmount(totalAmount.toFixed(2));
        setCategory(groupCategory);
        setSelectedCurrency(firstCurrency);
        setSelectedDate(firstDate);
        setIsInstallment(true);
        setInstallmentCount(totalCount);
    }, [expenseToEdit, safeInstallmentGroup, currency]);

    useEffect(() => {
        if (expenseToEdit || safeInstallmentGroup || !prefillExpense) return;
        setDescription(prefillExpense.description || '');
        setAmount(prefillExpense.amount ? prefillExpense.amount.toString() : '');
        setCategory(prefillExpense.category || '');
        setSelectedCurrency(prefillExpense.currency || currency);
        setSelectedDate(new Date());
        setIsInstallment(false);
        setInstallmentCount(2);
    }, [expenseToEdit, safeInstallmentGroup, prefillExpense, currency]);

    const handleDescriptionChange = useCallback((text) => {
        setDescription(text);
        setSuggestion('');
        if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
        if (!category && text.trim().length >= 3) {
            suggestionTimer.current = setTimeout(async () => {
                try {
                    const res = await expenseService.suggestCategory(text.trim());
                    if (res?.suggestedCategory) setSuggestion(res.suggestedCategory);
                } catch { /* ignore */ }
            }, 600);
        }
    }, [category]);

    const applySuggestion = useCallback(() => {
        if (suggestion) {
            setCategory(suggestion);
            setSuggestion('');
        }
    }, [suggestion]);

    const applyParsed = (parsed) => {
        if (parsed.description) setDescription(parsed.description);
        if (parsed.amount) setAmount(String(parsed.amount));
        if (parsed.category) setCategory(parsed.category);
        if (parsed.currency) setSelectedCurrency(parsed.currency);
        if (parsed.date) {
            const d = new Date(parsed.date);
            if (!isNaN(d.getTime())) setSelectedDate(d);
        }
    };

    const handleNlSubmit = useCallback(async () => {
        if (!nlText.trim()) return;
        setNlLoading(true);
        try {
            const parsed = await aiService.parseExpense(nlText.trim());
            applyParsed(parsed);
            setShowNlInput(false);
            setNlText('');
        } catch {
            Alert.alert(t('error'), t('couldNotParseExpense') || 'Could not parse. Please fill in manually.');
        } finally {
            setNlLoading(false);
        }
    }, [nlText, t]);

    const handleScanReceipt = useCallback(async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!galleryPerm.granted) {
                    Alert.alert(t('error'), 'Camera or gallery permission is required.');
                    return;
                }
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                base64: true,
                quality: 0.6,
            });
            if (result.canceled || !result.assets?.[0]?.base64) return;

            setScanLoading(true);
            const asset = result.assets[0];
            const mimeType = asset.mimeType || 'image/jpeg';
            const parsed = await aiService.scanReceipt(asset.base64, mimeType);
            applyParsed(parsed);
        } catch {
            Alert.alert(t('error'), t('couldNotScanReceipt') || 'Could not scan receipt. Please fill in manually.');
        } finally {
            setScanLoading(false);
        }
    }, [t]);

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

    const createInstallmentGroupId = () => (
        `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    );

    const buildInstallmentPayloads = (baseDate, totalAmount, count, groupId) => {
        const installments = splitInstallments(totalAmount, count);
        const trimmedDescription = description.trim();
        return installments.map((installmentAmount, index) => {
            const parcelDate = new Date(baseDate);
            parcelDate.setMonth(parcelDate.getMonth() + index);
            return {
                description: `${trimmedDescription} (${index + 1}/${count})`,
                amount: installmentAmount,
                currency: selectedCurrency,
                date: parcelDate.toISOString().split('T')[0],
                ...(category && { category }),
                ...(groupId && { groupId }),
            };
        });
    };

    const createInstallments = async (payloads) => {
        const created = [];
        for (const payload of payloads) {
            const result = await expenseService.create(payload);
            created.push(result);
        }
        return created;
    };

    const rollbackInstallments = async (createdExpenses) => {
        const ids = createdExpenses.map((item) => item.id).filter(Boolean);
        if (ids.length === 0) return;
        await Promise.allSettled(ids.map((expenseId) => expenseService.delete(expenseId)));
    };

    const getInstallmentIndex = (item) => {
        if (item?._installmentIndex) return item._installmentIndex;
        const match = item?.description?.match(/\((\d+)\/(\d+)\)$/);
        return match ? parseInt(match[1], 10) : 0;
    };

    const sortInstallmentItems = (items) => (
        [...(Array.isArray(items) ? items.filter(Boolean) : [])]
            .map((item) => ({ ...item, _sortIndex: getInstallmentIndex(item) }))
            .sort((a, b) => a._sortIndex - b._sortIndex)
    );

    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert(t('attention'), t('enterDescription'));
            return;
        }
        if (!amount || !Number.isFinite(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert(t('attention'), t('enterValidAmount'));
            return;
        }

        try {
            setSaving(true);

            if (safeInstallmentGroup && safeInstallmentGroup.length > 0 && isInstallment && installmentCount > 1) {
                const baseDate = new Date(selectedDate);
                const totalAmount = parseFloat(amount);
                const existingGroupId = safeInstallmentGroup.find((item) => item?.groupId)?.groupId;
                const groupId = existingGroupId || createInstallmentGroupId();
                const payloads = buildInstallmentPayloads(baseDate, totalAmount, installmentCount, groupId);
                const sortedItems = sortInstallmentItems(safeInstallmentGroup);
                const updatePairs = [];
                const createPayloads = [];

                sortedItems.forEach((item, index) => {
                    const payload = payloads[index];
                    if (!payload) return;
                    if (item.id) {
                        updatePairs.push({ id: item.id, payload });
                    } else {
                        createPayloads.push(payload);
                    }
                });

                if (payloads.length > sortedItems.length) {
                    createPayloads.push(...payloads.slice(sortedItems.length));
                }

                const deleteIds = sortedItems
                    .slice(payloads.length)
                    .map((item) => item.id)
                    .filter(Boolean);

                if (updatePairs.length > 0) {
                    const updateResults = await Promise.allSettled(
                        updatePairs.map(({ id, payload }) => expenseService.update(id, payload))
                    );
                    const updateFailed = updateResults.some((result) => result.status === 'rejected');
                    if (updateFailed) {
                        Alert.alert(t('error'), t('couldNotSave'));
                        return;
                    }
                }

                let createdExpenses = [];
                if (createPayloads.length > 0) {
                    try {
                        createdExpenses = await createInstallments(createPayloads);
                    } catch (error) {
                        await rollbackInstallments(createdExpenses);
                        Alert.alert(t('error'), t('couldNotSave'));
                        return;
                    }
                }

                if (deleteIds.length > 0) {
                    const deleteResults = await Promise.allSettled(
                        deleteIds.map((expenseId) => expenseService.delete(expenseId))
                    );
                    const deleteFailed = deleteResults.some((result) => result.status === 'rejected');
                    if (deleteFailed) {
                        Alert.alert(t('error'), t('couldNotDelete'));
                        handleClose();
                        onSuccess();
                        return;
                    }
                }

                const sampleExpense = createdExpenses[0] || updatePairs[0]?.payload;
                if (sampleExpense) {
                    await checkBudgetAlert(sampleExpense);
                }

                showSuccess(t('installmentsUpdated'));
                handleClose();
            } else if (!expenseToEdit && isInstallment && installmentCount > 1) {
                const baseDate = new Date(selectedDate);
                const totalAmount = parseFloat(amount);
                const groupId = createInstallmentGroupId();
                const payloads = buildInstallmentPayloads(baseDate, totalAmount, installmentCount, groupId);
                let createdExpenses = [];

                try {
                    createdExpenses = await createInstallments(payloads);
                } catch (error) {
                    await rollbackInstallments(createdExpenses);
                    Alert.alert(t('error'), t('couldNotSave'));
                    return;
                }

                if (createdExpenses[0]) {
                    await checkBudgetAlert(createdExpenses[0]);
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
                    ...(expenseToEdit?.groupId && { groupId: expenseToEdit.groupId }),
                };

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        Keyboard.dismiss();
        setDescription('');
        setAmount('');
        setCategory('');
        setSuggestion('');
        if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
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
    const isInstallmentLocked = !!safeInstallmentGroup;
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
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {expenseToEdit
                                ? t('editExpense')
                                : safeInstallmentGroup
                                    ? t('editInstallments')
                                    : t('newExpense')}
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* AI action row */}
                        {!showNlInput ? (
                            <View style={styles.aiRow}>
                                <TouchableOpacity
                                    style={styles.aiButton}
                                    onPress={() => setShowNlInput(true)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
                                    <Text style={styles.aiButtonText}>{t('smartInput') || 'Smart input'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.aiButton, scanLoading && styles.aiButtonDisabled]}
                                    onPress={handleScanReceipt}
                                    disabled={scanLoading}
                                    activeOpacity={0.75}
                                >
                                    {scanLoading
                                        ? <ActivityIndicator size={14} color={colors.primary} />
                                        : <Ionicons name="camera-outline" size={15} color={colors.primary} />
                                    }
                                    <Text style={styles.aiButtonText}>{t('scanReceipt') || 'Scan receipt'}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.nlInputContainer}>
                                <TextInput
                                    style={styles.nlInput}
                                    placeholder={t('nlPlaceholder') || 'e.g. coffee 3.50 yesterday'}
                                    placeholderTextColor={colors.textLighter}
                                    value={nlText}
                                    onChangeText={setNlText}
                                    autoFocus
                                    returnKeyType="go"
                                    onSubmitEditing={handleNlSubmit}
                                    maxLength={300}
                                />
                                <TouchableOpacity
                                    style={[styles.nlGoButton, nlLoading && styles.aiButtonDisabled]}
                                    onPress={handleNlSubmit}
                                    disabled={nlLoading}
                                >
                                    {nlLoading
                                        ? <ActivityIndicator size={14} color={colors.textWhite} />
                                        : <Ionicons name="arrow-forward" size={16} color={colors.textWhite} />
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.nlCancelButton}
                                    onPress={() => { setShowNlInput(false); setNlText(''); }}
                                >
                                    <Ionicons name="close" size={16} color={colors.textLight} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('description')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('descriptionPlaceholder')}
                                placeholderTextColor={colors.textLighter}
                                value={description}
                                onChangeText={handleDescriptionChange}
                                maxLength={200}
                                autoFocus
                            />
                            {suggestion ? (
                                <TouchableOpacity onPress={applySuggestion} style={styles.suggestionChip}>
                                    <Ionicons name="flash" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={styles.suggestionText}>
                                        {t(`categories.${suggestion}`)} — {t('tapToApply') || 'tap to apply'}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

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
                                                    {t('installmentValue')}: {CURRENCIES.find(c => c.code === selectedCurrency).symbol || '€'}
                                                    {firstInstallmentAmount.toFixed(2)}
                                                    {firstInstallmentAmount !== lastInstallmentAmount
                                                        ? ` - ${lastInstallmentAmount.toFixed(2)}`
                                                        : ''}
                                                </Text>
                                                <Text style={styles.installmentTotalText}>
                                                    {t('totalValue')}: {CURRENCIES.find(c => c.code === selectedCurrency).symbol || '€'}{parsedAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

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

                        {showAdvanced && (
                            <View style={styles.advancedSection}>
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
                                        ? (isInstallment && !expenseToEdit && !safeInstallmentGroup
                                            ? t('creatingInstallments')
                                            : t('saving'))
                                        : (expenseToEdit || safeInstallmentGroup)
                                            ? t('saveChanges')
                                            : isInstallment
                                                ? `${t('addExpense')} (${installmentCount}×)`
                                                : t('addExpense')
                                    }
                                </Text>
                            </View>
                        </TouchableOpacity>
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
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primaryBg,
        alignSelf: 'flex-start',
    },
    suggestionText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
        color: colors.primary,
    },
    aiRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    aiButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primaryBg,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    aiButtonDisabled: { opacity: 0.5 },
    aiButtonText: {
        fontSize: fontSize.xs + 1,
        fontFamily: fontFamily.semibold,
        color: colors.primary,
    },
    nlInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    nlInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.text,
    },
    nlGoButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nlCancelButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
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
