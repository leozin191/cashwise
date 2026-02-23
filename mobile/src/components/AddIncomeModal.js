import { useEffect, useState } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { incomeService, aiService } from '../services/api';
import * as Haptics from 'expo-haptics';
import { CURRENCIES } from '../constants/currencies';
import { getCategoryColor } from '../constants/categories';
import CategoryIcon from './CategoryIcon';

const INCOME_CATEGORIES = ['Salary', 'Investment', 'Interest', 'NetSales', 'Gift', 'Remittances', 'Savings', 'Cashback'];
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function AddIncomeModal({
    visible,
    onClose,
    onSuccess,
    incomeToEdit = null,
    prefillIncome = null,
}) {
    const { t, language } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();
    const { colors } = useTheme();
    const { showSuccess } = useSnackbar();
    const styles = createStyles(colors);

    const [description, setDescription] = useState(incomeToEdit?.description || '');
    const [amount, setAmount] = useState(incomeToEdit?.amount?.toString() || '');
    const [selectedCurrency, setSelectedCurrency] = useState(incomeToEdit?.currency || currency);
    const [selectedDate, setSelectedDate] = useState(
        incomeToEdit?.date ? new Date(incomeToEdit.date) : new Date()
    );
    const [category, setCategory] = useState(incomeToEdit?.category || '');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showNlInput, setShowNlInput] = useState(false);
    const [nlText, setNlText] = useState('');
    const [nlLoading, setNlLoading] = useState(false);

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

    const handleNlSubmit = async () => {
        if (!nlText.trim()) return;
        setNlLoading(true);
        try {
            const parsed = await aiService.parseIncome(nlText.trim());
            applyParsed(parsed);
            setShowNlInput(false);
            setNlText('');
        } catch {
            Alert.alert(t('error'), t('couldNotParseExpense') || 'Could not parse. Please fill in manually.');
        } finally {
            setNlLoading(false);
        }
    };

    useEffect(() => {
        if (!incomeToEdit) return;
        setDescription(incomeToEdit.description || '');
        setAmount(incomeToEdit.amount?.toString() || '');
        setSelectedCurrency(incomeToEdit.currency || currency);
        setSelectedDate(incomeToEdit.date ? new Date(incomeToEdit.date) : new Date());
        setCategory(incomeToEdit.category || '');
    }, [incomeToEdit, currency]);

    useEffect(() => {
        if (incomeToEdit || !prefillIncome) return;
        setDescription(prefillIncome.description || '');
        setAmount(prefillIncome.amount ? prefillIncome.amount.toString() : '');
        setSelectedCurrency(prefillIncome.currency || currency);
        setSelectedDate(new Date());
        setCategory('');
    }, [incomeToEdit, prefillIncome, currency]);

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
            const incomeData = {
                description: description.trim(),
                amount: parseFloat(amount),
                currency: selectedCurrency,
                date: selectedDate.toISOString().split('T')[0],
                ...(category && { category }),
            };

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (incomeToEdit) {
                await incomeService.update(incomeToEdit.id, incomeData);
                showSuccess(t('incomeUpdated'));
            } else {
                await incomeService.create(incomeData);
                showSuccess(t('incomeAdded'));
            }

            handleClose();
            onSuccess();
        } catch (error) {
            Alert.alert(t('error'), t('couldNotSaveIncome'));
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setAmount('');
        setCategory('');
        setSelectedCurrency(currency);
        setSelectedDate(new Date());
        setShowDatePicker(false);
        setShowCurrencyPicker(false);
        setShowNlInput(false);
        setNlText('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.overlayTouch} />
                </TouchableWithoutFeedback>
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {incomeToEdit ? t('editIncome') : t('newIncome')}
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.closeButton}>x</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* AI smart input */}
                        {!showNlInput ? (
                            <TouchableOpacity
                                style={styles.aiButton}
                                onPress={() => setShowNlInput(true)}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
                                <Text style={styles.aiButtonText}>{t('smartInput') || 'Smart input'}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.nlInputContainer}>
                                <TextInput
                                    style={styles.nlInput}
                                    placeholder={t('nlIncomePlaceholder') || 'e.g. salary 1500 today'}
                                    placeholderTextColor={colors.textLighter}
                                    value={nlText}
                                    onChangeText={setNlText}
                                    autoFocus
                                    returnKeyType="go"
                                    onSubmitEditing={handleNlSubmit}
                                    maxLength={300}
                                />
                                <TouchableOpacity
                                    style={[styles.nlGoButton, nlLoading && styles.nlGoButtonDisabled]}
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
                                placeholder={t('incomeDescriptionPlaceholder')}
                                placeholderTextColor={colors.textLighter}
                                value={description}
                                onChangeText={setDescription}
                                maxLength={200}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('category')}</Text>
                            <View style={styles.categoryGrid}>
                                {INCOME_CATEGORIES.map((cat) => {
                                    const isSelected = category === cat;
                                    const catColor = getCategoryColor(cat);
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.categoryChip,
                                                isSelected && { backgroundColor: catColor, borderColor: catColor },
                                            ]}
                                            onPress={() => setCategory(isSelected ? '' : cat)}
                                            activeOpacity={0.7}
                                        >
                                            <CategoryIcon
                                                category={cat}
                                                size={14}
                                                color={isSelected ? '#fff' : catColor}
                                            />
                                            <Text style={[
                                                styles.categoryChipText,
                                                isSelected && styles.categoryChipTextSelected,
                                            ]}>
                                                {t(`categories.${cat}`) || cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

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
                                    {CURRENCIES.find(c => c.code === selectedCurrency).flag} {selectedCurrency} - {CURRENCIES.find(c => c.code === selectedCurrency).name}
                                </Text>
                                <Ionicons name="chevron-down" size={14} color={colors.textLight} />
                            </TouchableOpacity>

                            {showCurrencyPicker && (
                                <ScrollView style={styles.currencyDropdown} nestedScrollEnabled={true}>
                                    {CURRENCIES.map((curr) => (
                                        <TouchableOpacity
                                            key={curr.code}
                                            style={[
                                                styles.currencyOption,
                                                selectedCurrency === curr.code && styles.currencyOptionActive,
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
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.saveButtonText}>
                            {saving ? t('saving') : incomeToEdit ? t('saveChanges') : t('addIncome')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'flex-end',
        },
        overlayTouch: {
            flex: 1,
        },
        sheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: borderRadius.xxxl,
            borderTopRightRadius: borderRadius.xxxl,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xl,
            maxHeight: '85%',
            ...shadows.large,
        },
        handleBar: {
            width: 40,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: spacing.md,
            marginBottom: spacing.lg,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
        },
        title: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        closeButton: {
            fontSize: fontSize.huge,
            color: colors.textLight,
            fontWeight: fontWeight.light,
        },
        content: {
            marginTop: spacing.sm,
        },
        aiButton: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.primaryBg,
            marginBottom: spacing.md,
        },
        aiButtonText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
        nlInputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
        },
        nlInput: {
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.primary,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
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
        nlGoButtonDisabled: {
            opacity: 0.6,
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
        inputGroup: {
            marginBottom: spacing.lg,
        },
        label: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.sm,
        },
        input: {
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.text,
        },
        categoryGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
        },
        categoryChip: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: colors.background,
            gap: spacing.xs,
        },
        categoryChipText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
        },
        categoryChipTextSelected: {
            color: '#fff',
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
        },
        currencySymbol: {
            fontSize: fontSize.xl + 2,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginRight: spacing.sm,
        },
        amountInput: {
            flex: 1,
            fontSize: fontSize.xl + 2,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        dateSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
        },
        dateSelectorText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.medium,
            color: colors.text,
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
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        currencySelectorText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        currencySelectorArrow: {
            marginLeft: spacing.sm,
        },
        currencyDropdown: {
            marginTop: spacing.sm,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            maxHeight: 200,
            ...shadows.large,
        },
        currencyOption: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
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
        saveButton: {
            backgroundColor: colors.primary,
            borderRadius: borderRadius.full,
            paddingVertical: spacing.md,
            alignItems: 'center',
            marginTop: spacing.md,
        },
        saveButtonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: colors.textWhite,
            fontFamily: fontFamily.bold,
            fontSize: fontSize.base,
        },
    });
