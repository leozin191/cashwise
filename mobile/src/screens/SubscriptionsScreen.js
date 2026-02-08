import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    TextInput,
    Alert,
    Switch,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing, borderRadius, fontSize, fontWeight, fontFamily, shadows } from '../constants/theme';
import { normalizeCategory } from '../constants/categories';
import CategoryIcon from '../components/CategoryIcon';
import { subscriptionService, expenseService } from '../services/api';
import FadeIn from '../components/FadeIn';

const FREQUENCIES = ['MONTHLY', 'WEEKLY', 'YEARLY'];

export default function SubscriptionsScreen() {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { currency, getCurrencyInfo } = useCurrency();

    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingSub, setEditingSub] = useState(null);

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
                if (s.frequency === 'WEEKLY') monthly *= 4.33;
                if (s.frequency === 'YEARLY') monthly /= 12;
                return sum + monthly;
            }, 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getFrequencyLabel = (freq) => {
        const map = { MONTHLY: t('monthly'), WEEKLY: t('weekly'), YEARLY: t('yearly') };
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
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
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
                Alert.alert(t('success'), t('subscriptionSaved'));
            } else {
                await subscriptionService.create(data);

                Alert.alert(
                    t('createCurrentExpense'),
                    t('createCurrentExpenseHint'),
                    [
                        {
                            text: t('no'),
                            style: 'cancel',
                            onPress: () => Alert.alert(t('success'), t('subscriptionSaved')),
                        },
                        {
                            text: t('yes'),
                            onPress: async () => {
                                try {
                                    const today = new Date().toISOString().split('T')[0];
                                    await expenseService.create({
                                        description: data.description + ' (Subscription)',
                                        amount: data.amount,
                                        currency: data.currency,
                                        category: data.category,
                                        date: today,
                                    });
                                    Alert.alert(t('success'), t('subscriptionSaved') + '\n' + t('processSuccess'));
                                } catch (error) {
                                    Alert.alert(t('success'), t('subscriptionSaved'));
                                }
                            },
                        },
                    ]
                );
            }
            setShowModal(false);
            await loadSubscriptions();
        } catch (error) {
            Alert.alert(t('error'), t('couldNotSave'));
        }
    };

    const handleToggle = async (sub) => {
        try {
            await subscriptionService.toggle(sub.id);
            await loadSubscriptions();
        } catch (error) {
            Alert.alert(t('error'), 'Could not toggle subscription');
        }
    };

    const handleDelete = (sub) => {
        Alert.alert(t('attention'), t('deleteSubscriptionConfirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await subscriptionService.delete(sub.id);
                        Alert.alert(t('success'), t('subscriptionDeleted'));
                        await loadSubscriptions();
                    } catch (error) {
                        Alert.alert(t('error'), t('couldNotDelete'));
                    }
                },
            },
        ]);
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

                {/* Botão Adicionar */}
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Ionicons name="add-circle" size={22} color={colors.primary} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.addButtonText}>{t('addSubscription')}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal Adicionar/Editar */}
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
                            {/* Descrição */}
                            <Text style={styles.label}>{t('description')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Netflix, Spotify, Gym..."
                                placeholderTextColor={colors.textLighter}
                                value={description}
                                onChangeText={setDescription}
                                maxLength={200}
                            />

                            {/* Valor */}
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

                            {/* Frequência */}
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

                            {/* Dia do mês */}
                            <Text style={styles.label}>{t('dayOfMonth')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1-28"
                                placeholderTextColor={colors.textLighter}
                                value={dayOfMonth}
                                onChangeText={(v) => {
                                    const num = parseInt(v);
                                    if (!v || (num >= 1 && num <= 28)) setDayOfMonth(v);
                                }}
                                keyboardType="number-pad"
                            />

                            {/* Categoria */}
                            <Text style={styles.label}>{t('category')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                                {['Entertainment', 'Services', 'Health', 'Transport', 'Food', 'Utilities', 'Insurance', 'General'].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <CategoryIcon category={cat} size={18} color={selectedCategory === cat ? '#FFF' : colors.primary} />
                                        <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                                            {t(`categories.${cat}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Botão Salvar */}
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>{t('save')}</Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        paddingTop: 60,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
    },
    headerTitle: { fontSize: fontSize.xxxl, fontFamily: fontFamily.bold, color: colors.textWhite },
    headerStats: { marginTop: spacing.md },
    headerLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.7)' },
    headerAmount: { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, color: colors.textWhite },
    content: { flex: 1, paddingTop: spacing.lg },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl * 2 },
    emptyText: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
    emptySubtext: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.textLight, textAlign: 'center' },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        ...shadows.medium,
    },
    cardInactive: { opacity: 0.5 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primaryBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    iconInactive: { backgroundColor: colors.border },
    cardInfo: { flex: 1, marginRight: spacing.sm },
    cardTitle: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: 2 },
    textInactive: { color: colors.textLight },
    cardSubtext: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.textLight },
    cardRight: { alignItems: 'flex-end' },
    cardAmount: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.primary, marginBottom: spacing.xs },
    switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xl,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        marginTop: spacing.sm,
    },
    addButtonText: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    overlayTouchArea: { flex: 1 },
    handleBar: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.xs },
    modal: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xxxl, borderTopRightRadius: borderRadius.xxxl, maxHeight: '85%' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, color: colors.text },
    closeButton: { fontSize: fontSize.huge, color: colors.textLight, fontWeight: fontWeight.light },
    modalContent: { padding: spacing.xl },
    label: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
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
    currencySymbol: { fontSize: fontSize.xl, fontFamily: fontFamily.semibold, color: colors.primary, marginRight: spacing.sm },
    amountInput: { flex: 1, padding: spacing.lg, fontSize: fontSize.xl, fontFamily: fontFamily.semibold, color: colors.text },
    frequencyRow: { flexDirection: 'row', gap: spacing.sm },
    freqButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    freqButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    freqText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.textLight },
    freqTextActive: { color: colors.textWhite },
    categoriesScroll: { marginBottom: spacing.md },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
        backgroundColor: colors.background,
    },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.textLight, marginLeft: spacing.xs },
    catTextActive: { color: colors.textWhite },
    saveButton: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...shadows.colored,
    },
    saveButtonText: { color: colors.textWhite, fontSize: fontSize.lg, fontFamily: fontFamily.bold },
});
