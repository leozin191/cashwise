import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import currencyService from '../services/currency';
import { expenseService, subscriptionService } from '../services/api';
import { getBudgets } from '../utils/budgets';
import { calculateForecast, getAveragePerDay, getHighestExpense, getTopCategory, groupByMonth, getLastNMonths } from '../utils/helpers';
import { generateReportHTML } from '../utils/pdfGenerator';

export default function ReportSettingsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { language, t } = useLanguage();
    const { colors } = useTheme();
    const { currency, getCurrencyInfo } = useCurrency();

    const [userEmail, setUserEmail] = useState('');
    const [exportingPDF, setExportingPDF] = useState(false);

    useEffect(() => {
        loadUserEmail();
    }, []);

    const loadUserEmail = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('@user_email');
            if (savedEmail) setUserEmail(savedEmail);
        } catch (error) {
            console.error('Error loading user email:', error);
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
            Alert.alert(t('error'), t('pdfExportFailed'));
        } finally {
            setExportingPDF(false);
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
                    <Text style={styles.headerTitle}>{t('report')}</Text>
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

                <View style={{ height: 80 }} />
            </ScrollView>
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
        settingLeft: {
            flex: 1,
        },
        settingLabel: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.xs,
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
    });
