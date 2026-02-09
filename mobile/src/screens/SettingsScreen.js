import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Switch,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { useCurrency } from '../contexts/CurrencyContext';
import { CURRENCIES } from '../constants/currencies';
import currencyService from '../services/currency';
import { expenseService, subscriptionService } from '../services/api';
import { getBudgets } from '../utils/budgets';
import { calculateForecast, getAveragePerDay, getHighestExpense, getTopCategory, groupByMonth, getLastNMonths } from '../utils/helpers';
import OfflineBanner from '../components/OfflineBanner';
import { generateReportHTML } from '../utils/pdfGenerator';
import { useSnackbar } from '../contexts/SnackbarContext';
import ConfirmSheet from '../components/ConfirmSheet';
import { ensureNotificationPermissions, getReminderSettings, saveReminderSettings, scheduleReminders } from '../utils/notifications';
import {
    createBackupPayload,
    getAutoBackupMeta,
    loadAutoBackupPayload,
    restoreBackupPayload,
    runAutoBackupIfDue,
    setAutoBackupEnabled,
} from '../utils/backup';

export default function SettingsScreen() {
    const { language, changeLanguage, t } = useLanguage();
    const { isDark, toggleTheme, colors } = useTheme();
    const { currency, changeCurrency, getCurrencyInfo } = useCurrency();
    const { showSuccess } = useSnackbar();

    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [currentRate, setCurrentRate] = useState(null);
    const [updatingRates, setUpdatingRates] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [exportingPDF, setExportingPDF] = useState(false);
    const [clearingData, setClearingData] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [remindersEnabled, setRemindersEnabled] = useState(false);
    const [reminderDaysBefore, setReminderDaysBefore] = useState([0, 1, 2]);
    const [reminderTime, setReminderTime] = useState(new Date());
    const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
    const [updatingReminders, setUpdatingReminders] = useState(false);
    const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false);
    const [autoBackupTimestamp, setAutoBackupTimestamp] = useState(null);
    const [autoBackupRunning, setAutoBackupRunning] = useState(false);

    useEffect(() => {
        loadExchangeRateInfo();
    }, [currency]);

    useEffect(() => {
        loadUserEmail();
    }, []);

    useEffect(() => {
        loadReminderPreferences();
    }, []);

    useEffect(() => {
        loadAutoBackupSettings();
    }, []);

    const loadUserEmail = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('@user_email');
            if (savedEmail) setUserEmail(savedEmail);
        } catch (error) {
            console.error('Error loading user email:', error);
        }
    };

    const toTimeString = (date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const formatTimeLabel = (date) => (
        date.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        })
    );

    const loadReminderPreferences = async () => {
        const settings = await getReminderSettings();
        setRemindersEnabled(!!settings.enabled);
        setReminderDaysBefore(settings.daysBefore || [0, 1, 2]);

        const [hours, minutes] = (settings.time || '09:00').split(':').map((val) => parseInt(val, 10));
        const timeDate = new Date();
        timeDate.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
        setReminderTime(timeDate);
    };

    const updateReminderSettings = async (nextSettings, { silent = false } = {}) => {
        setUpdatingReminders(true);
        try {
            const saved = await saveReminderSettings(nextSettings);
            setRemindersEnabled(!!saved.enabled);
            setReminderDaysBefore(saved.daysBefore || []);

            const [hours, minutes] = (saved.time || '09:00').split(':').map((val) => parseInt(val, 10));
            const timeDate = new Date();
            timeDate.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
            setReminderTime(timeDate);

            if (!silent) {
                const [expenses, subscriptions] = await Promise.all([
                    expenseService.getAll(),
                    subscriptionService.getAll(),
                ]);
                await scheduleReminders({ expenses, subscriptions, t });
                showSuccess(t('remindersUpdated'));
            }
        } catch (error) {
            console.error('Error updating reminders:', error);
        } finally {
            setUpdatingReminders(false);
        }
    };

    const handleToggleReminders = async () => {
        const nextEnabled = !remindersEnabled;
        if (nextEnabled) {
            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(t('error'), t('notificationsPermissionDenied'));
                return;
            }
        }

        await updateReminderSettings({
            enabled: nextEnabled,
            time: toTimeString(reminderTime),
            daysBefore: reminderDaysBefore,
        });
    };

    const handleToggleReminderDay = async (day) => {
        const nextDays = reminderDaysBefore.includes(day)
            ? reminderDaysBefore.filter((value) => value !== day)
            : [...reminderDaysBefore, day];

        if (nextDays.length === 0) {
            Alert.alert(t('attention'), t('reminderSelectAtLeastOne'));
            return;
        }

        await updateReminderSettings({
            enabled: remindersEnabled,
            time: toTimeString(reminderTime),
            daysBefore: nextDays.sort(),
        });
    };

    const loadAutoBackupSettings = async () => {
        try {
            const meta = await getAutoBackupMeta();
            setAutoBackupEnabledState(meta.enabled);
            setAutoBackupTimestamp(meta.timestamp);
        } catch (error) {
            console.error('Error loading auto backup settings:', error);
        }
    };

    const formatBackupTimestamp = (timestamp) => {
        if (!timestamp) return '—';
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        return new Date(timestamp).toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleToggleAutoBackup = async () => {
        const nextEnabled = !autoBackupEnabled;
        setAutoBackupRunning(true);
        try {
            await setAutoBackupEnabled(nextEnabled);
            setAutoBackupEnabledState(nextEnabled);
            if (nextEnabled) {
                await runAutoBackupIfDue({ force: true });
                const meta = await getAutoBackupMeta();
                setAutoBackupTimestamp(meta.timestamp);
            }
        } catch (error) {
            console.error('Error toggling auto backup:', error);
        } finally {
            setAutoBackupRunning(false);
        }
    };

    const handleRestoreAutoBackup = async () => {
        try {
            const payload = await loadAutoBackupPayload();
            if (!payload) {
                Alert.alert(t('error'), t('autoBackupMissing'));
                return;
            }

            setConfirmConfig({
                title: t('restore'),
                message: t('restoreConfirm'),
                icon: 'refresh-outline',
                primaryLabel: t('restore'),
                primaryTone: 'destructive',
                onPrimary: async () => {
                    setConfirmConfig(null);
                    try {
                        await restoreBackupPayload(payload);
                        showSuccess(t('restoreSuccess'));
                    } catch (error) {
                        Alert.alert(t('error'), t('restoreFailed'));
                    }
                },
                secondaryLabel: t('cancel'),
                onSecondary: () => setConfirmConfig(null),
            });
        } catch (error) {
            Alert.alert(t('error'), t('restoreFailed'));
        }
    };

    const loadExchangeRateInfo = async () => {
        try {
            if (currency !== 'EUR') {
                const rate = await currencyService.getRate(currency);
                setCurrentRate(rate);
            } else {
                await currencyService.getRates();
                setCurrentRate(1);
            }

            const timestamp = currencyService.getLastUpdateTimestamp();
            setLastUpdate(timestamp);
        } catch (error) {
            console.error('Error loading exchange rate info:', error);
        }
    };

    const handleUpdateRates = async () => {
        try {
            setUpdatingRates(true);
            await currencyService.forceUpdate();
            await loadExchangeRateInfo();
            showSuccess(t('ratesUpdated'));
        } catch (error) {
            Alert.alert(t('error'), t('errorUpdating'));
            console.error('Error updating rates:', error);
        } finally {
            setUpdatingRates(false);
        }
    };

    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return '—';

        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) return t('today');
        if (hours < 24) return `${t('today')} ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        if (days === 1) return t('yesterday');
        return `${days} ${t('daysAgo')}`;
    };

    const handleClearData = () => {
        setConfirmConfig({
            title: t('clearData'),
            message: t('clearDataConfirm'),
            icon: 'trash-outline',
            primaryLabel: t('clearData'),
            primaryTone: 'destructive',
            onPrimary: async () => {
                setConfirmConfig(null);
                try {
                    setClearingData(true);
                    const expenses = await expenseService.getAll();
                    for (const exp of expenses) {
                        await expenseService.delete(exp.id);
                    }
                    try {
                        const subs = await subscriptionService.getAll();
                        for (const sub of subs) {
                            await subscriptionService.delete(sub.id);
                        }
                    } catch (e) {}
                    await AsyncStorage.removeItem('@budgets');
                    await AsyncStorage.removeItem('@exchange_rates');
                    await AsyncStorage.removeItem('@exchange_rates_timestamp');
                    showSuccess(t('dataCleared'));
                } catch (error) {
                    console.error('Clear data error:', error);
                    Alert.alert(t('error'), t('couldNotDelete'));
                } finally {
                    setClearingData(false);
                }
            },
            secondaryLabel: t('cancel'),
            onSecondary: () => setConfirmConfig(null),
        });
    };

    const handleExportCSV = async () => {
        try {
            const expenses = await expenseService.getAll();
            if (expenses.length === 0) {
                Alert.alert(t('attention'), t('noExpensesToExport'));
                return;
            }

            const BOM = '\uFEFF';
            const header = 'Date,Description,Category,Amount,Currency\n';
            const sanitizeCSV = (val) => {
                const str = String(val);
                if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
                return str;
            };
            const rows = expenses.map(exp => {
                const desc = `"${sanitizeCSV((exp.description || '').replace(/"/g, '""'))}"`;
                const cat = `"${sanitizeCSV((exp.category || '').replace(/"/g, '""'))}"`;
                return `${exp.date},${desc},${cat},${exp.amount},${exp.currency || 'EUR'}`;
            }).join('\n');

            const csv = BOM + header + rows;
            const today = new Date().toISOString().split('T')[0];
            const filePath = `${FileSystem.documentDirectory}cashwise-expenses-${today}.csv`;

            await FileSystem.writeAsStringAsync(filePath, csv, { encoding: 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, { mimeType: 'text/csv' });
            } else {
                Alert.alert(t('error'), t('sharingNotAvailable'));
            }
        } catch (error) {
            console.error('Export CSV error:', error);
            Alert.alert(t('error'), t('exportFailed'));
        }
    };

    const handleFullBackup = async () => {
        try {
            const backup = await createBackupPayload();

            const today = new Date().toISOString().split('T')[0];
            const filePath = `${FileSystem.documentDirectory}cashwise-backup-${today}.json`;

            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2), {
                encoding: 'utf8',
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, { mimeType: 'application/json' });
            } else {
                Alert.alert(t('error'), t('sharingNotAvailable'));
            }
        } catch (error) {
            console.error('Full backup error:', error);
            Alert.alert(t('error'), t('exportFailed'));
        }
    };

    const handleImportBackup = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const content = await FileSystem.readAsStringAsync(fileUri, {
                encoding: 'utf8',
            });

            let backup;
            try {
                backup = JSON.parse(content);
            } catch (e) {
                Alert.alert(t('error'), t('invalidBackupFile'));
                return;
            }

            if (!backup.version || !backup.expenses) {
                Alert.alert(t('error'), t('invalidBackupFile'));
                return;
            }

            setConfirmConfig({
                title: t('restore'),
                message: t('restoreConfirm'),
                icon: 'refresh-outline',
                primaryLabel: t('restore'),
                primaryTone: 'destructive',
                onPrimary: async () => {
                    setConfirmConfig(null);
                    try {
                        await restoreBackupPayload(backup);
                        showSuccess(t('restoreSuccess'));
                    } catch (error) {
                        console.error('Restore error:', error);
                        Alert.alert(t('error'), t('restoreFailed'));
                    }
                },
                secondaryLabel: t('cancel'),
                onSecondary: () => setConfirmConfig(null),
            });
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert(t('error'), t('importFailed'));
        }
    };

    const isValidEmail = (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    };

    const handleSaveEmail = async () => {
        const trimmed = userEmail.trim();
        if (!trimmed) {
            await AsyncStorage.removeItem('@user_email');
            return;
        }

        if (!isValidEmail(trimmed)) {
            Alert.alert(t('attention'), t('emailInvalid'));
            return;
        }

        try {
            await AsyncStorage.setItem('@user_email', trimmed);
            setUserEmail(trimmed);
            showSuccess(t('emailSaved'));
        } catch (error) {
            console.error('Error saving user email:', error);
        }
    };

    const handleExportPDF = async () => {
        const trimmedEmail = userEmail.trim();
        if (!trimmedEmail) {
            Alert.alert(t('attention'), t('emailRequired'));
            return;
        }
        if (!isValidEmail(trimmedEmail)) {
            Alert.alert(t('attention'), t('emailInvalid'));
            return;
        }

        try {
            setExportingPDF(true);

            const [expenses, subscriptions, budgets] = await Promise.all([
                expenseService.getAll(),
                subscriptionService.getAll(),
                getBudgets(),
            ]);

            const convertedExpenses = await Promise.all(
                expenses.map(async (exp) => {
                    const amountInEUR = await currencyService.convertToEUR(exp.amount, exp.currency || 'EUR');
                    const convertedAmount = await currencyService.convert(amountInEUR, currency);
                    return {
                        ...exp,
                        amount: convertedAmount,
                        currency,
                    };
                })
            );

            const convertedSubscriptions = await Promise.all(
                subscriptions.map(async (sub) => {
                    const amountInEUR = await currencyService.convertToEUR(sub.amount, sub.currency || 'EUR');
                    const convertedAmount = await currencyService.convert(amountInEUR, currency);
                    return {
                        ...sub,
                        amount: convertedAmount,
                        currency,
                    };
                })
            );

            const convertedBudgets = {};
            for (const [category, budget] of Object.entries(budgets || {})) {
                const amountInEUR = await currencyService.convertToEUR(budget.limit, budget.currency || 'EUR');
                const convertedAmount = await currencyService.convert(amountInEUR, currency);
                convertedBudgets[category] = {
                    ...budget,
                    limit: convertedAmount,
                    currency,
                };
            }

            const stats = {
                totalExpenses: convertedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
                transactionCount: convertedExpenses.length,
                highestExpense: getHighestExpense(convertedExpenses),
                averagePerDay: getAveragePerDay(convertedExpenses),
                topCategory: getTopCategory(convertedExpenses),
            };

            const groupedByMonth = groupByMonth(convertedExpenses);
            const lastMonths = getLastNMonths(6);
            const monthlyData = lastMonths.map((month) => ({
                label: month.label,
                value: groupedByMonth[month.key] || 0,
            }));

            const forecast = calculateForecast(convertedExpenses, convertedSubscriptions, language);

            const html = generateReportHTML({
                expenses: convertedExpenses,
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

            const isAvailable = await MailComposer.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert(t('error'), t('emailServiceUnavailable'));
                return;
            }

            await MailComposer.composeAsync({
                recipients: [trimmedEmail],
                subject: t('pdfEmailSubject'),
                body: t('pdfEmailBody'),
                attachments: [uri],
            });
        } catch (error) {
            console.error('Export PDF error:', error);
            Alert.alert(t('error'), t('pdfExportFailed'));
        } finally {
            setExportingPDF(false);
        }
    };

    const styles = createStyles(colors);
    const isRatesStale = lastUpdate && (Date.now() - lastUpdate) > 24 * 60 * 60 * 1000;

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>{t('settings')}</Text>
            </LinearGradient>

            <ScrollView style={styles.content}>
                {/* Aparência */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="moon-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('appearance')}</Text>
                    </View>

                    {/* Modo Escuro */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('darkMode')}</Text>
                            <Text style={styles.settingSubtext}>
                                {isDark ? t('darkModeOn') : t('darkModeOff')}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    {/* Idioma */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('language')}</Text>
                            <Text style={styles.settingSubtext}>
                                {language === 'pt' ? 'Português' : 'English'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.languageButton}
                            onPress={() => changeLanguage(language === 'pt' ? 'en' : 'pt')}
                        >
                            <Text style={styles.languageButtonText}>
                                {language === 'pt' ? '🇵🇹 PT' : '🇬🇧 EN'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Notificacoes */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="notifications-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('notifications')}</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('reminders')}</Text>
                            <Text style={styles.settingSubtext}>{t('remindersHint')}</Text>
                        </View>
                        <Switch
                            value={remindersEnabled}
                            onValueChange={handleToggleReminders}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                            disabled={updatingReminders}
                        />
                    </View>

                    {remindersEnabled && (
                        <>
                            <TouchableOpacity
                                style={styles.settingItem}
                                onPress={() => setShowReminderTimePicker(true)}
                                disabled={updatingReminders}
                            >
                                <View style={styles.settingLeft}>
                                    <Text style={styles.settingLabel}>{t('remindersTime')}</Text>
                                    <Text style={styles.settingSubtext}>{formatTimeLabel(reminderTime)}</Text>
                                </View>
                                <Text style={styles.arrow}>›</Text>
                            </TouchableOpacity>

                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <Text style={styles.settingLabel}>{t('remindOnDueDate')}</Text>
                                </View>
                                <Switch
                                    value={reminderDaysBefore.includes(0)}
                                    onValueChange={() => handleToggleReminderDay(0)}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                    disabled={updatingReminders}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <Text style={styles.settingLabel}>{t('remind1DayBefore')}</Text>
                                </View>
                                <Switch
                                    value={reminderDaysBefore.includes(1)}
                                    onValueChange={() => handleToggleReminderDay(1)}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                    disabled={updatingReminders}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <Text style={styles.settingLabel}>{t('remind2DaysBefore')}</Text>
                                </View>
                                <Switch
                                    value={reminderDaysBefore.includes(2)}
                                    onValueChange={() => handleToggleReminderDay(2)}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={colors.surface}
                                    disabled={updatingReminders}
                                />
                            </View>

                            {showReminderTimePicker && (
                                <View style={styles.inlinePicker}>
                                    <DateTimePicker
                                        value={reminderTime}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selected) => {
                                            if (Platform.OS === 'android') {
                                                setShowReminderTimePicker(false);
                                            }
                                            if (selected) {
                                                setReminderTime(selected);
                                                if (Platform.OS === 'android') {
                                                    updateReminderSettings({
                                                        enabled: remindersEnabled,
                                                        time: toTimeString(selected),
                                                        daysBefore: reminderDaysBefore,
                                                    }, { silent: false });
                                                }
                                            }
                                        }}
                                    />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity
                                            style={styles.pickerDoneButton}
                                            onPress={() => {
                                                setShowReminderTimePicker(false);
                                                updateReminderSettings({
                                                    enabled: remindersEnabled,
                                                    time: toTimeString(reminderTime),
                                                    daysBefore: reminderDaysBefore,
                                                }, { silent: false });
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.pickerDoneText}>OK</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Gastos */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="wallet-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('expenses')}</Text>
                    </View>

                    {/* Moeda */}
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setShowCurrencyModal(true)}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('currency')}</Text>
                            <Text style={styles.settingSubtext}>
                                {getCurrencyInfo().flag} {getCurrencyInfo().name} ({currency})
                            </Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Taxas de Câmbio */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('exchangeRates')}</Text>
                    </View>

                    {/* Info das taxas */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>
                                1 EUR = {currentRate ? currentRate.toFixed(4) : '—'} {currency}
                            </Text>
                            <Text style={styles.settingSubtext}>
                                {t('lastUpdate')}: {formatLastUpdate(lastUpdate)}
                            </Text>
                        </View>
                    </View>

                    {isRatesStale && <OfflineBanner message={t('ratesStale')} />}

                    {/* Botão Atualizar */}
                    <TouchableOpacity
                        style={[styles.updateButton, updatingRates && styles.updateButtonDisabled]}
                        onPress={handleUpdateRates}
                        disabled={updatingRates}
                    >
                        <View style={styles.updateButtonContent}>
                            <Ionicons
                                name={updatingRates ? 'hourglass-outline' : 'refresh-outline'}
                                size={18}
                                color={colors.textWhite}
                                style={{ marginRight: spacing.sm }}
                            />
                            <Text style={styles.updateButtonText}>
                                {updatingRates ? t('updating') : t('updateRates')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Dados */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="folder-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('data')}</Text>
                    </View>

                    {/* Exportar CSV */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleExportCSV}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('exportCSV')}</Text>
                            <Text style={styles.settingSubtext}>{t('exportAsCSV')}</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Backup Completo */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleFullBackup}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('fullBackup')}</Text>
                            <Text style={styles.settingSubtext}>{t('exportFullBackup')}</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Importar Backup */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleImportBackup}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('importBackup')}</Text>
                            <Text style={styles.settingSubtext}>{t('restoreData')}</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Backup automatico */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('autoBackup')}</Text>
                            <Text style={styles.settingSubtext}>{t('autoBackupHint')}</Text>
                            <Text style={styles.settingSubtext}>
                                {t('lastBackup')}: {formatBackupTimestamp(autoBackupTimestamp)}
                            </Text>
                        </View>
                        <Switch
                            value={autoBackupEnabled}
                            onValueChange={handleToggleAutoBackup}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                            disabled={autoBackupRunning}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={handleRestoreAutoBackup}
                        disabled={autoBackupRunning}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('restoreLastBackup')}</Text>
                            <Text style={styles.settingSubtext}>
                                {t('lastBackup')}: {formatBackupTimestamp(autoBackupTimestamp)}
                            </Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Limpar */}
                    <TouchableOpacity
                        style={[styles.settingItem, clearingData && styles.settingItemDisabled]}
                        onPress={handleClearData}
                        disabled={clearingData}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={[styles.settingLabel, styles.dangerText]}>
                                {t('clearData')}
                            </Text>
                            <Text style={styles.settingSubtext}>{t('clearDataHint')}</Text>
                        </View>
                        {clearingData ? (
                            <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                            <Text style={[styles.arrow, styles.dangerText]}>›</Text>
                        )}
                    </TouchableOpacity>
                </View>



                {/* Relatorio */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="mail-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('report')}</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('emailForReports')}</Text>
                            <TextInput
                                style={styles.emailInput}
                                value={userEmail}
                                onChangeText={setUserEmail}
                                onBlur={handleSaveEmail}
                                placeholder={t('emailPlaceholder')}
                                placeholderTextColor={colors.textLight}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.reportButton, exportingPDF && styles.reportButtonDisabled]}
                        onPress={handleExportPDF}
                        disabled={exportingPDF}
                    >
                        <View style={styles.reportButtonContent}>
                            <Ionicons
                                name={exportingPDF ? 'hourglass-outline' : 'document-text-outline'}
                                size={18}
                                color={colors.textWhite}
                                style={{ marginRight: spacing.sm }}
                            />
                            <Text style={styles.reportButtonText}>
                                {exportingPDF ? t('generatingPDF') : t('exportPDFReport')}
                            </Text>
                        </View>
                        <Text style={styles.reportButtonHint}>{t('exportPDFHint')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Sobre */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('about')}</Text>
                    </View>

                    {/* Versão */}
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>{t('version')}</Text>
                        <Text style={styles.settingValue}>1.0.0</Text>
                    </View>

                    {/* Desenvolvedor */}
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>{t('developedBy')}</Text>
                        <Text style={styles.settingValue}>Leozara</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Modal de Moeda */}
            <Modal
                visible={showCurrencyModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCurrencyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowCurrencyModal(false)}>
                        <View style={styles.overlayTouchArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.currencyModal}>
                        <View style={styles.handleBar} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('selectCurrency')}</Text>
                            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {CURRENCIES.map((curr) => (
                                <TouchableOpacity
                                    key={curr.code}
                                    style={[
                                        styles.currencyOption,
                                        currency === curr.code && styles.currencyOptionActive
                                    ]}
                                    onPress={() => {
                                        changeCurrency(curr.code);
                                        setShowCurrencyModal(false);
                                    }}
                                >
                                    <Text style={styles.currencyFlag}>{curr.flag}</Text>
                                    <View style={styles.currencyInfo}>
                                        <Text style={styles.currencyName}>{curr.name}</Text>
                                        <Text style={styles.currencyCode}>{curr.code}</Text>
                                    </View>
                                    <Text style={styles.currencySymbol}>{curr.symbol}</Text>
                                    {currency === curr.code && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <ConfirmSheet
                visible={!!confirmConfig}
                onClose={() => setConfirmConfig(null)}
                {...confirmConfig}
            />
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
        section: {
            marginBottom: spacing.xxl,
        },
        sectionTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.md,
            marginHorizontal: spacing.xl,
        },
        sectionTitle: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        settingItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.surface,
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing.xl,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.sm,
            borderRadius: borderRadius.lg,
            ...shadows.small,
        },
        settingItemDisabled: {
            opacity: 0.6,
        },
        inlinePicker: {
            marginHorizontal: spacing.xl,
            marginTop: spacing.sm,
            marginBottom: spacing.sm,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            ...shadows.small,
        },
        pickerDoneButton: {
            alignSelf: 'flex-end',
            marginTop: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
            backgroundColor: colors.primaryBg,
        },
        pickerDoneText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
        settingLeft: {
            flex: 1,
        },
        settingLabel: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.xs,
        },
        settingSubtext: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        settingValue: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textLight,
        },
        emailInput: {
            marginTop: spacing.xs,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.text,
        },
        languageButton: {
            backgroundColor: colors.primaryBg,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.primary,
        },
        languageButtonText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
        arrow: {
            fontSize: fontSize.xxl,
            color: colors.textLight,
            fontWeight: fontWeight.light,
        },
        dangerText: {
            color: colors.error,
        },
        updateButton: {
            backgroundColor: colors.primary,
            marginHorizontal: spacing.xl,
            marginTop: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            ...shadows.small,
        },
        updateButtonDisabled: {
            opacity: 0.5,
        },
        updateButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        updateButtonText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textWhite,
        },
        reportButton: {
            backgroundColor: colors.primary,
            marginHorizontal: spacing.xl,
            marginTop: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            ...shadows.small,
        },
        reportButtonDisabled: {
            opacity: 0.5,
        },
        reportButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        reportButtonText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textWhite,
        },
        reportButtonHint: {
            marginTop: spacing.xs,
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textWhite,
            opacity: 0.9,
            textAlign: 'center',
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
        currencyModal: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
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
        currencyOption: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.lg,
            marginHorizontal: spacing.lg,
            marginVertical: spacing.xs,
            borderRadius: borderRadius.md,
            backgroundColor: colors.background,
        },
        currencyOptionActive: {
            backgroundColor: colors.primaryBg,
            borderWidth: 2,
            borderColor: colors.primary,
        },
        currencyFlag: {
            fontSize: 32,
            marginRight: spacing.md,
        },
        currencyInfo: {
            flex: 1,
        },
        currencyName: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        currencyCode: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        currencySymbol: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: colors.textLight,
            marginRight: spacing.md,
        },
    });
