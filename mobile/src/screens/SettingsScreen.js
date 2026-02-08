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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { useCurrency } from '../contexts/CurrencyContext';
import { CURRENCIES } from '../constants/currencies';
import currencyService from '../services/currency';
import { expenseService, subscriptionService } from '../services/api';
import { getBudgets } from '../utils/budgets';

export default function SettingsScreen() {
    const { language, changeLanguage, t } = useLanguage();
    const { isDark, toggleTheme, colors } = useTheme();
    const { currency, changeCurrency, getCurrencyInfo } = useCurrency();

    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [currentRate, setCurrentRate] = useState(null);
    const [updatingRates, setUpdatingRates] = useState(false);

    useEffect(() => {
        loadExchangeRateInfo();
    }, [currency]);

    const loadExchangeRateInfo = async () => {
        try {
            const timestamp = currencyService.getLastUpdateTimestamp();
            setLastUpdate(timestamp);

            if (currency !== 'EUR') {
                const rate = await currencyService.getRate(currency);
                setCurrentRate(rate);
            } else {
                setCurrentRate(1);
            }
        } catch (error) {
            console.error('Error loading exchange rate info:', error);
        }
    };

    const handleUpdateRates = async () => {
        try {
            setUpdatingRates(true);
            await currencyService.forceUpdate();
            await loadExchangeRateInfo();
            Alert.alert(t('success'), t('ratesUpdated'));
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
        Alert.alert(
            t('attention'),
            t('clearDataConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('clearData'),
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(t('success'), t('featureInDev'));
                    },
                },
            ]
        );
    };

    const handleExportCSV = async () => {
        try {
            const expenses = await expenseService.getAll();
            if (expenses.length === 0) {
                Alert.alert(t('attention'), t('noExpensesToExport'));
                return;
            }

            const header = 'Date,Description,Category,Amount,Currency\n';
            const sanitizeCSV = (val) => {
                const str = String(val);
                if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
                return str;
            };
            const rows = expenses.map(exp => {
                const desc = `"${sanitizeCSV((exp.description || '').replace(/"/g, '""'))}"`;
                return `${exp.date},${desc},${sanitizeCSV(exp.category || '')},${exp.amount},${exp.currency || 'EUR'}`;
            }).join('\n');

            const csv = header + rows;
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
            const expenses = await expenseService.getAll();
            let subscriptions = [];
            try { subscriptions = await subscriptionService.getAll(); } catch (e) {}
            const budgets = await getBudgets();

            const langSetting = await AsyncStorage.getItem('@language');
            const currSetting = await AsyncStorage.getItem('@currency');
            const themeSetting = await AsyncStorage.getItem('@theme');

            const backup = {
                version: 1,
                exportDate: new Date().toISOString(),
                expenses,
                subscriptions,
                budgets,
                settings: {
                    language: langSetting,
                    currency: currSetting,
                    theme: themeSetting,
                },
            };

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

            Alert.alert(t('attention'), t('restoreConfirm'), [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('restore'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete existing expenses
                            const existing = await expenseService.getAll();
                            for (const exp of existing) {
                                await expenseService.delete(exp.id);
                            }

                            // Restore expenses
                            for (const exp of backup.expenses) {
                                const { id, createdAt, updatedAt, ...data } = exp;
                                await expenseService.create(data);
                            }

                            // Restore subscriptions
                            if (backup.subscriptions?.length > 0) {
                                try {
                                    const existingSubs = await subscriptionService.getAll();
                                    for (const sub of existingSubs) {
                                        await subscriptionService.delete(sub.id);
                                    }
                                    for (const sub of backup.subscriptions) {
                                        const { id, createdAt, updatedAt, ...data } = sub;
                                        await subscriptionService.create(data);
                                    }
                                } catch (e) {
                                    console.error('Error restoring subscriptions:', e);
                                }
                            }

                            // Restore budgets
                            if (backup.budgets) {
                                await AsyncStorage.setItem('@budgets', JSON.stringify(backup.budgets));
                            }

                            // Restore settings
                            if (backup.settings) {
                                if (backup.settings.language) await AsyncStorage.setItem('@language', backup.settings.language);
                                if (backup.settings.currency) await AsyncStorage.setItem('@currency', backup.settings.currency);
                                if (backup.settings.theme) await AsyncStorage.setItem('@theme', backup.settings.theme);
                            }

                            Alert.alert(t('success'), t('restoreSuccess'));
                        } catch (error) {
                            console.error('Restore error:', error);
                            Alert.alert(t('error'), t('restoreFailed'));
                        }
                    },
                },
            ]);
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert(t('error'), t('importFailed'));
        }
    };

    const styles = createStyles(colors);

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

                    {/* Limpar */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleClearData}>
                        <View style={styles.settingLeft}>
                            <Text style={[styles.settingLabel, styles.dangerText]}>
                                {t('clearData')}
                            </Text>
                            <Text style={styles.settingSubtext}>{t('clearDataHint')}</Text>
                        </View>
                        <Text style={[styles.arrow, styles.dangerText]}>›</Text>
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
