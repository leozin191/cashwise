import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { useCurrency } from '../contexts/CurrencyContext';
import { CURRENCIES } from '../constants/currencies';
import currencyService from '../services/currency';

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

            // Pega taxa atual da moeda selecionada
            if (currency !== 'EUR') {
                const rate = await currencyService.getRate(currency);
                setCurrentRate(rate);
            } else {
                setCurrentRate(1); // EUR para EUR = 1
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

    const handleExportBackup = () => {
        Alert.alert(t('success'), t('featureInDev'));
    };

    const handleImportBackup = () => {
        Alert.alert(t('success'), t('featureInDev'));
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

                    {/* Exportar */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleExportBackup}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('exportBackup')}</Text>
                            <Text style={styles.settingSubtext}>{t('saveToFile')}</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Importar */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleImportBackup}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>{t('importBackup')}</Text>
                            <Text style={styles.settingSubtext}>Restaurar dados</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>

                    {/* Limpar */}
                    <TouchableOpacity style={styles.settingItem} onPress={handleClearData}>
                        <View style={styles.settingLeft}>
                            <Text style={[styles.settingLabel, styles.dangerText]}>
                                {t('clearData')}
                            </Text>
                            <Text style={styles.settingSubtext}>Apagar todas as despesas</Text>
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
                    <View style={styles.currencyModal}>
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
