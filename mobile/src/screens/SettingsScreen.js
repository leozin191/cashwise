import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Switch,
    Alert,
    Modal,
    Platform,
    DeviceEventEmitter,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../constants/theme';
import { createStyles } from './settingsStyles';
import { useCurrency } from '../contexts/CurrencyContext';
import { CURRENCIES } from '../constants/currencies';
import currencyService from '../services/currency';
import { expenseService, subscriptionService } from '../services/api';
import OfflineBanner from '../components/OfflineBanner';
import { useSnackbar } from '../contexts/SnackbarContext';
import { ensureNotificationPermissions, getReminderSettings, saveReminderSettings, scheduleReminders } from '../utils/notifications';
import OnboardingScreen from '../components/OnboardingScreen';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const REMEMBER_KEY = 'cashwise_remember_credentials';
const SECURE_EMAIL_KEY = 'cashwise_bio_email';
const SECURE_PASSWORD_KEY = 'cashwise_bio_password';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const scrollRef = useRef(null);
    const sectionOffsets = useRef({});
    const { language, changeLanguage, t } = useLanguage();
    const { isDark, toggleTheme, colors } = useTheme();
    const { user, logout } = useAuth();
    const { currency, changeCurrency, getCurrencyInfo } = useCurrency();
    const { showSuccess } = useSnackbar();

    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [currentRate, setCurrentRate] = useState(null);
    const [updatingRates, setUpdatingRates] = useState(false);
    const [remindersEnabled, setRemindersEnabled] = useState(false);
    const [reminderDaysBefore, setReminderDaysBefore] = useState([0, 1, 2]);
    const [reminderTime, setReminderTime] = useState(new Date());
    const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
    const [updatingReminders, setUpdatingReminders] = useState(false);
    const [pendingSection, setPendingSection] = useState(null);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    useEffect(() => {
        loadExchangeRateInfo();
    }, [currency]);

    useEffect(() => {
        loadReminderPreferences();
        loadBiometricState();
    }, []);

    const sectionParam = route.params?.section;

    useEffect(() => {
        if (sectionParam) {
            setPendingSection(sectionParam);
        }
    }, [sectionParam]);

    useEffect(() => {
        if (!pendingSection) return;
        const offset = sectionOffsets.current[pendingSection];
        if (offset === undefined) return;
        scrollRef.current.scrollTo({
            y: Math.max(offset - spacing.lg, 0),
            animated: true,
        });
        setPendingSection(null);
    }, [pendingSection]);

    const handleSectionLayout = (key) => (event) => {
        sectionOffsets.current[key] = event.nativeEvent.layout.y;
        if (pendingSection === key) {
            scrollRef.current.scrollTo({
                y: Math.max(event.nativeEvent.layout.y - spacing.lg, 0),
                animated: true,
            });
            setPendingSection(null);
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

    const loadBiometricState = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setBiometricAvailable(hasHardware && isEnrolled);

            const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
            setBiometricEnabled(enabled === 'true');
        } catch (error) {
            setBiometricAvailable(false);
        }
    };

    const handleToggleBiometric = async () => {
        if (biometricEnabled) {
            await SecureStore.deleteItemAsync(SECURE_EMAIL_KEY);
            await SecureStore.deleteItemAsync(SECURE_PASSWORD_KEY);
            await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
            setBiometricEnabled(false);
            showSuccess(t('biometricDisabled'));
        } else {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: t('enableBiometric'),
                cancelLabel: t('cancel'),
                disableDeviceFallback: false,
            });

            if (!result.success) return;

            const raw = await SecureStore.getItemAsync(REMEMBER_KEY);
            if (!raw) {
                Alert.alert(t('attention'), t('rememberMe'));
                return;
            }

            let savedEmail, savedPassword;
            try {
                ({ email: savedEmail, password: savedPassword } = JSON.parse(raw));
            } catch {
                await SecureStore.deleteItemAsync(REMEMBER_KEY);
                Alert.alert(t('error'), t('somethingWentWrong'));
                return;
            }
            await SecureStore.setItemAsync(SECURE_EMAIL_KEY, savedEmail);
            await SecureStore.setItemAsync(SECURE_PASSWORD_KEY, savedPassword);
            await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
            setBiometricEnabled(true);
            showSuccess(t('biometricEnabled'));
        }
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
        } finally {
            setUpdatingRates(false);
        }
    };

    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return '--';

        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) return t('today');
        if (hours < 24) return `${t('today')} ${new Date(timestamp).toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`;
        if (days === 1) return t('yesterday');
        return `${days} ${t('daysAgo')}`;
    };

    const styles = createStyles(colors);
    const isRatesStale = lastUpdate && (Date.now() - lastUpdate) > 24 * 60 * 60 * 1000;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>{t('settings')}</Text>
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={() => {
                            const returnTo = route.params?.returnTo;
                            if (returnTo) {
                                navigation.navigate(returnTo);
                                return;
                            }
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }}
                        activeOpacity={0.8}
                        accessibilityLabel={t('cancel')}
                        accessibilityRole="button"
                    >
                        <Ionicons name="close" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} ref={scrollRef}>
                <View style={styles.section} onLayout={handleSectionLayout('appearance')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="moon-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('appearance')}</Text>
                    </View>

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
                            accessibilityLabel={t('darkMode')}
                        />
                    </View>

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
                            accessibilityLabel={t('language')}
                            accessibilityRole="button"
                        >
                            <Text style={styles.languageButtonText}>
                    {language === 'pt' ? '🇵🇹 PT' : '🇬🇧 EN'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section} onLayout={handleSectionLayout('notifications')}>
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
                            accessibilityLabel={t('reminders')}
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
                                <Text style={styles.arrow}>&gt;</Text>
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

                <View style={styles.section} onLayout={handleSectionLayout('expenses')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="wallet-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('expenses')}</Text>
                    </View>

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
                        <Text style={styles.arrow}>&gt;</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section} onLayout={handleSectionLayout('exchangeRates')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('exchangeRates')}</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>
                                    1 EUR = {currentRate ? currentRate.toFixed(4) : '--'} {currency}
                            </Text>
                            <Text style={styles.settingSubtext}>
                                {t('lastUpdate')}: {formatLastUpdate(lastUpdate)}
                            </Text>
                        </View>
                    </View>

                    {isRatesStale && <OfflineBanner message={t('ratesStale')} />}

                    <TouchableOpacity
                        style={[styles.updateButton, updatingRates && styles.updateButtonDisabled]}
                        onPress={handleUpdateRates}
                        disabled={updatingRates}
                        accessibilityLabel={t('updateRates')}
                        accessibilityRole="button"
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

                <View style={styles.section} onLayout={handleSectionLayout('data')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="folder-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('data')}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('DataSettings', { returnTo: 'Settings' })}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('manageData')}</Text>
                            <Text style={styles.settingSubtext}>{t('manageDataHint')}</Text>
                        </View>
                        <Text style={styles.arrow}>&gt;</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section} onLayout={handleSectionLayout('report')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="mail-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('report')}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('ReportSettings', { returnTo: 'Settings' })}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('manageReport')}</Text>
                            <Text style={styles.settingSubtext}>{t('manageReportHint')}</Text>
                        </View>
                        <Text style={styles.arrow}>&gt;</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('MonthlyReport', { returnTo: 'Settings' })}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('monthlyReport')}</Text>
                            <Text style={styles.settingSubtext}>{t('monthlyReportHint')}</Text>
                        </View>
                        <Text style={styles.arrow}>&gt;</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section} onLayout={handleSectionLayout('account')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="person-circle-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('account')}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('EditProfile', { returnTo: 'Settings' })}
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{user?.name}</Text>
                            <Text style={styles.settingSubtext}>{user?.email}</Text>
                        </View>
                        <Text style={styles.arrow}>&gt;</Text>
                    </TouchableOpacity>

                    {biometricAvailable && (
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Text style={styles.settingLabel}>{t('biometric')}</Text>
                                <Text style={styles.settingSubtext}>{t('biometricHint')}</Text>
                            </View>
                            <Switch
                                value={biometricEnabled}
                                onValueChange={handleToggleBiometric}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.surface}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => {
                            Alert.alert(
                                t('logout'),
                                t('logoutConfirm'),
                                [
                                    { text: t('cancel'), style: 'cancel' },
                                    { text: t('logout'), style: 'destructive', onPress: logout },
                                ]
                            );
                        }}
                        accessibilityLabel={t('logout')}
                        accessibilityRole="button"
                    >
                        <View style={styles.logoutButtonContent}>
                            <Ionicons name="log-out-outline" size={18} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.section} onLayout={handleSectionLayout('about')}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('about')}</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>{t('version')}</Text>
                        <Text style={styles.settingValue}>1.0.0</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>{t('developedBy')}</Text>
                        <Text style={styles.settingValue}>Leozara</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={async () => {
                            await AsyncStorage.removeItem(OnboardingScreen.ONBOARDING_KEY);
                            DeviceEventEmitter.emit('replayTutorial');
                        }}
                        accessibilityLabel={t('replayTutorial')}
                        accessibilityRole="button"
                    >
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('replayTutorial')}</Text>
                            <Text style={styles.settingSubtext}>{t('replayTutorialHint')}</Text>
                        </View>
                        <Ionicons name="refresh-outline" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

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
                            <TouchableOpacity onPress={() => setShowCurrencyModal(false)} accessibilityLabel={t('cancel')} accessibilityRole="button">
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

        </View>
    );
}
