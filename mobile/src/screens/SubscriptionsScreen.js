import { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    TextInput,
    Alert,
    Switch,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing } from '../constants/theme';
import { createStyles } from './subscriptionsStyles';
import { normalizeCategory, CATEGORIES } from '../constants/categories';
import CategoryIcon from '../components/CategoryIcon';
import { subscriptionService, expenseService } from '../services/api';
import * as Haptics from 'expo-haptics';
import FadeIn from '../components/FadeIn';
import { useSnackbar } from '../contexts/SnackbarContext';
import ConfirmSheet from '../components/ConfirmSheet';

const FREQUENCIES = ['MONTHLY', 'YEARLY'];

export default function SubscriptionsScreen() {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();
    const { showSuccess, showError } = useSnackbar();

    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingSub, setEditingSub] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState(null);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Entertainment');
    const [selectedCurrency, setSelectedCurrency] = useState(currency);
    const [frequency, setFrequency] = useState('MONTHLY');
    const [dayOfMonth, setDayOfMonth] = useState('1');

    useEffect(() => {
        loadSubscriptions();
    }, []);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            const data = await subscriptionService.getAll();
            setSubscriptions(data);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadSubscriptions();
    };

    const getMonthlyTotal = () => {
        return subscriptions
            .filter(s => s.active)
            .reduce((sum, s) => {
                let monthly = parseFloat(s.amount);
                if (s.frequency === 'YEARLY') monthly /= 12;
                return sum + monthly;
            }, 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getFrequencyLabel = (freq) => {
        const map = { MONTHLY: t('monthly'), YEARLY: t('yearly') };
        return map[freq] || freq;
    };

    const openAddModal = () => {
        setEditingSub(null);
        setDescription('');
        setAmount('');
        setSelectedCategory('Entertainment');
        setSelectedCurrency(currency);
        setFrequency('MONTHLY');
        setDayOfMonth('1');
        setShowModal(true);
    };

    const openEditModal = (sub) => {
        setEditingSub(sub);
        setDescription(sub.description);
        setAmount(sub.amount.toString());
        setSelectedCategory(sub.category);
        setSelectedCurrency(sub.currency);
        setFrequency(sub.frequency);
        setDayOfMonth(sub.dayOfMonth.toString());
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert(t('attention'), t('enterDescription'));
            return;
        }
        if (!amount || !Number.isFinite(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert(t('attention'), t('enterValidAmount'));
            return;
        }

        const data = {
            description: description.trim(),
            amount: parseFloat(amount),
            currency: selectedCurrency,
            category: selectedCategory,
            frequency,
            dayOfMonth: parseInt(dayOfMonth) || 1,
            active: true,
        };

        try {
            if (editingSub) {
                await subscriptionService.update(editingSub.id, data);
                showSuccess(t('subscriptionSaved'));
            } else {
                await subscriptionService.create(data);

                setConfirmConfig({
                    title: t('createCurrentExpense'),
                    message: t('createCurrentExpenseHint'),
                    icon: 'help-circle-outline',
                    primaryLabel: t('yes'),
                    onPrimary: async () => {
                        setConfirmConfig(null);
                        try {
                            const today = new Date().toISOString().split('T')[0];
                            await expenseService.create({
                                description: data.description + ' (Subscription)',
                                amount: data.amount,
                                currency: data.currency,
                                category: data.category,
                                date: today,
                            });
                            showSuccess(`${t('subscriptionSaved')} ${t('processSuccess')}`);
                        } catch (error) {
                            showSuccess(t('subscriptionSaved'));
                        }
                    },
                    secondaryLabel: t('no'),
                    onSecondary: () => {
                        setConfirmConfig(null);
                        showSuccess(t('subscriptionSaved'));
                    },
                });
            }
            setShowModal(false);
            await loadSubscriptions();
        } catch (error) {
            showError(t('couldNotSave'));
        }
    };

    const handleToggle = async (sub) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await subscriptionService.toggle(sub.id);
            await loadSubscriptions();
        } catch (error) {
            showError(t('couldNotSave'));
        }
    };

    const handleDelete = (sub) => {
        setConfirmConfig({
            title: t('delete'),
            message: t('deleteSubscriptionConfirm'),
            icon: 'trash-outline',
            primaryLabel: t('delete'),
            primaryTone: 'destructive',
            onPrimary: async () => {
                setConfirmConfig(null);
                try {
                    await subscriptionService.delete(sub.id);
                    showSuccess(t('subscriptionDeleted'));
                    await loadSubscriptions();
                } catch (error) {
                    showError(t('couldNotDelete'));
                }
            },
            secondaryLabel: t('cancel'),
            onSecondary: () => setConfirmConfig(null),
        });
    };

    const styles = createStyles(colors);

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>{t('subscriptions')}</Text>
                <View style={styles.headerStats}>
                    <Text style={styles.headerLabel}>{t('totalMonthly')}</Text>
                    <Text style={styles.headerAmount}>
                        {getCurrencyInfo().symbol}{getMonthlyTotal().toFixed(2)}
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {subscriptions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="repeat-outline" size={64} color={colors.textLight} />
                        <Text style={styles.emptyText}>{t('noSubscriptions')}</Text>
                        <Text style={styles.emptySubtext}>{t('noSubscriptionsHint')}</Text>
                    </View>
                ) : (
                    subscriptions.map((sub, index) => (
                        <FadeIn key={sub.id} delay={index * 100}>
                            <TouchableOpacity
                                style={[styles.card, !sub.active && styles.cardInactive]}
                                onPress={() => openEditModal(sub)}
                                onLongPress={() => handleDelete(sub)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconContainer, !sub.active && styles.iconInactive]}>
                                        <CategoryIcon
                                            category={normalizeCategory(sub.category)}
                                            size={24}
                                            color={sub.active ? colors.primary : colors.textLight}
                                        />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={[styles.cardTitle, !sub.active && styles.textInactive]}>
                                            {sub.description}
                                        </Text>
                                        <Text style={styles.cardSubtext}>
                                            {getFrequencyLabel(sub.frequency)} • {t('nextCharge')}: {formatDate(sub.nextDueDate)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={[styles.cardAmount, !sub.active && styles.textInactive]}>
                                        {getCurrencyInfo().symbol}{parseFloat(sub.amount).toFixed(2)}
                                    </Text>
                                    <Switch
                                        value={sub.active}
                                        onValueChange={() => handleToggle(sub)}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor={colors.surface}
                                        style={styles.switch}
                                    />
                                </View>
                            </TouchableOpacity>
                        </FadeIn>
                    ))
                )}

                <TouchableOpacity style={styles.addButton} onPress={openAddModal} accessibilityLabel={t('addSubscription')} accessibilityRole="button">
                    <Ionicons name="add-circle" size={22} color={colors.primary} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.addButtonText}>{t('addSubscription')}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
                        <View style={styles.overlayTouchArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modal}>
                        <View style={styles.handleBar} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingSub ? t('editSubscription') : t('addSubscription')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            <Text style={styles.label}>{t('description')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Netflix, Spotify, Gym..."
                                placeholderTextColor={colors.textLighter}
                                value={description}
                                onChangeText={setDescription}
                                maxLength={200}
                            />

                            <Text style={styles.label}>{t('amount')}</Text>
                            <View style={styles.amountContainer}>
                                <Text style={styles.currencySymbol}>{getCurrencyInfo().symbol}</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textLighter}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <Text style={styles.label}>{t('frequency')}</Text>
                            <View style={styles.frequencyRow}>
                                {FREQUENCIES.map((freq) => (
                                    <TouchableOpacity
                                        key={freq}
                                        style={[styles.freqButton, frequency === freq && styles.freqButtonActive]}
                                        onPress={() => setFrequency(freq)}
                                    >
                                        <Text style={[styles.freqText, frequency === freq && styles.freqTextActive]}>
                                            {getFrequencyLabel(freq)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{t('dayOfMonth')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1-31"
                                placeholderTextColor={colors.textLighter}
                                value={dayOfMonth}
                                onChangeText={(v) => {
                                    const num = parseInt(v);
                                    if (!v || (num >= 1 && num <= 31)) setDayOfMonth(v);
                                }}
                                keyboardType="number-pad"
                            />

                            <Text style={styles.label}>{t('category')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <CategoryIcon category={cat} size={18} color={selectedCategory === cat ? colors.textWhite : colors.primary} />
                                        <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                                            {t(`categories.${cat}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>{t('save')}</Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
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
