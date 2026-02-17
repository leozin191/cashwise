import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { expenseService, incomeService, subscriptionService } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import ConfirmSheet from '../components/ConfirmSheet';
import {
    createBackupPayload,
    getAutoBackupMeta,
    loadAutoBackupPayload,
    restoreBackupPayload,
    runAutoBackupIfDue,
    setAutoBackupEnabled,
} from '../utils/backup';

export default function DataSettingsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { language, t } = useLanguage();
    const { colors } = useTheme();
    const { showSuccess } = useSnackbar();

    const [clearingData, setClearingData] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false);
    const [autoBackupTimestamp, setAutoBackupTimestamp] = useState(null);
    const [autoBackupRunning, setAutoBackupRunning] = useState(false);

    useEffect(() => {
        loadAutoBackupSettings();
    }, []);

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
        if (!timestamp) return '--';
        const locale = language === 'en' ? 'en-US' : 'pt-BR';
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
                        const incomes = await incomeService.getAll();
                        for (const inc of incomes) {
                            await incomeService.delete(inc.id);
                        }
                    } catch (e) {
                        console.error('Clear incomes error:', e);
                    }
                    try {
                        const subs = await subscriptionService.getAll();
                        for (const sub of subs) {
                            await subscriptionService.delete(sub.id);
                        }
                    } catch (e) {
                        console.error('Clear subscriptions error:', e);
                    }
                    await AsyncStorage.removeItem('@budgets');
                    await AsyncStorage.removeItem('@exchange_rates');
                    await AsyncStorage.removeItem('@exchange_rates_timestamp');
                    showSuccess(t('dataCleared'));
                } catch (error) {
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
                        Alert.alert(t('error'), t('restoreFailed'));
                    }
                },
                secondaryLabel: t('cancel'),
                onSecondary: () => setConfirmConfig(null),
            });
        } catch (error) {
            Alert.alert(t('error'), t('importFailed'));
        }
    };

    const handleClose = () => {
        const returnTo = route.params?.returnTo;
        if (returnTo) {
            navigation.navigate(returnTo);
            return;
        }
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Settings');
        }
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
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>{t('data')}</Text>
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={handleClose}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name="folder-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.sectionTitle}>{t('data')}</Text>
                </View>

                <TouchableOpacity style={styles.settingItem} onPress={handleExportCSV}>
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingLabel}>{t('exportCSV')}</Text>
                        <Text style={styles.settingSubtext}>{t('exportAsCSV')}</Text>
                    </View>
                    <Text style={styles.arrow}>&gt;</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem} onPress={handleFullBackup}>
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingLabel}>{t('fullBackup')}</Text>
                        <Text style={styles.settingSubtext}>{t('exportFullBackup')}</Text>
                    </View>
                    <Text style={styles.arrow}>&gt;</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem} onPress={handleImportBackup}>
                    <View style={styles.settingLeft}>
                        <Text style={styles.settingLabel}>{t('importBackup')}</Text>
                        <Text style={styles.settingSubtext}>{t('restoreData')}</Text>
                    </View>
                    <Text style={styles.arrow}>&gt;</Text>
                </TouchableOpacity>

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
                    <Text style={styles.arrow}>&gt;</Text>
                </TouchableOpacity>

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
                        <Text style={[styles.arrow, styles.dangerText]}>&gt;</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 80 }} />
            </ScrollView>

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
        headerTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        headerTitle: {
            fontSize: fontSize.xxxl,
            fontFamily: fontFamily.bold,
            color: colors.textWhite,
        },
        headerActionButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        content: {
            flex: 1,
            paddingTop: spacing.xl,
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
        arrow: {
            fontSize: fontSize.xxl,
            color: colors.textLight,
            fontWeight: fontWeight.light,
        },
        dangerText: {
            color: colors.error,
        },
    });
