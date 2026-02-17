import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { incomeService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import { filterByThisMonth, filterByLast30Days, filterByAll, sortByNewest } from '../utils/helpers';
import IncomeCard from '../components/IncomeCard';
import AddIncomeModal from '../components/AddIncomeModal';
import IncomeDetailModal from '../components/IncomeDetailModal';
import { addDataChangedListener } from '../services/dataEvents';

export default function IncomesScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { t } = useLanguage();

    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [periodFilter, setPeriodFilter] = useState('thisMonth');
    const [showAdd, setShowAdd] = useState(false);
    const [detailIncome, setDetailIncome] = useState(null);
    const [incomeToEdit, setIncomeToEdit] = useState(null);

    const styles = createStyles(colors);

    const loadIncomes = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const data = await incomeService.getAll();
            setIncomes(Array.isArray(data) ? data : []);
        } catch (error) {
            Alert.alert(t('error'), t('couldNotLoad'));
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadIncomes();
    }, []);

    useEffect(() => {
        const subscription = addDataChangedListener((event) => {
            if (!event || event.type === 'incomes' || event.type === 'all') {
                loadIncomes({ silent: true });
            }
        });

        return () => subscription.remove();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadIncomes({ silent: true });
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadIncomes();
    };

    const dateFiltered = useMemo(() => {
        const safe = Array.isArray(incomes) ? incomes : [];
        if (periodFilter === 'thisMonth') return filterByThisMonth(safe);
        if (periodFilter === 'last30Days') return filterByLast30Days(safe);
        return filterByAll(safe);
    }, [incomes, periodFilter]);

    const filteredIncomes = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const filtered = dateFiltered.filter((inc) => {
            if (!query) return true;
            return inc.description?.toLowerCase().includes(query);
        });
        return sortByNewest(filtered);
    }, [dateFiltered, searchQuery]);

    const handleDelete = (income) => {
        Alert.alert(t('deleteIncome'), t('deleteIncomeConfirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await incomeService.delete(income.id);
                        await loadIncomes({ silent: true });
                    } catch (error) {
                        Alert.alert(t('error'), t('couldNotDelete'));
                    }
                },
            },
        ]);
    };

    const periodOptions = [
        { key: 'thisMonth', label: t('thisMonth') },
        { key: 'last30Days', label: t('last30Days') },
        { key: 'all', label: t('all') },
    ];

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
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>{t('income')}</Text>
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={() => navigation.navigate('Settings', { returnTo: 'Incomes' })}
                        activeOpacity={0.8}
                        accessibilityLabel={t('settings')}
                        accessibilityRole="button"
                    >
                        <Ionicons name="person-outline" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerSubtitle}>{t('incomeList')}</Text>
            </LinearGradient>

            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('searchIncomes')}
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow}
                    contentContainerStyle={{ paddingHorizontal: spacing.xl }}>
                    {periodOptions.map((option) => (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.periodChip,
                                periodFilter === option.key && styles.periodChipActive,
                            ]}
                            onPress={() => setPeriodFilter(option.key)}
                        >
                            <Text
                                style={[
                                    styles.periodChipText,
                                    periodFilter === option.key && styles.periodChipTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
                    <Ionicons name="add-circle" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
                    <Text style={styles.addButtonText}>{t('addIncome')}</Text>
                </TouchableOpacity>

                {filteredIncomes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cash-outline" size={56} color={colors.textLight} />
                        <Text style={styles.emptyText}>{t('noIncomes')}</Text>
                        <Text style={styles.emptySubtext}>{t('noIncomesSubtext')}</Text>
                    </View>
                ) : (
                    filteredIncomes.map((income) => (
                        <IncomeCard
                            key={income.id}
                            income={income}
                            onPress={() => setDetailIncome(income)}
                        />
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <AddIncomeModal
                visible={showAdd || !!incomeToEdit}
                incomeToEdit={incomeToEdit}
                onClose={() => {
                    setShowAdd(false);
                    setIncomeToEdit(null);
                }}
                onSuccess={() => {
                    setShowAdd(false);
                    setIncomeToEdit(null);
                    loadIncomes({ silent: true });
                }}
            />

            <IncomeDetailModal
                visible={!!detailIncome}
                income={detailIncome}
                onClose={() => setDetailIncome(null)}
                onEdit={(income) => {
                    setDetailIncome(null);
                    setIncomeToEdit(income);
                }}
                onDelete={(income) => {
                    setDetailIncome(null);
                    handleDelete(income);
                }}
            />

        </View>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        centerContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
            gap: spacing.md,
        },
        loadingText: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, color: colors.textLight },
        header: {
            paddingTop: 56,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.xl,
            borderBottomLeftRadius: borderRadius.xxl,
            borderBottomRightRadius: borderRadius.xxl,
        },
        headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        headerTitle: { fontSize: fontSize.xxxl, fontFamily: fontFamily.bold, color: colors.textWhite },
        headerSubtitle: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
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
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            marginHorizontal: spacing.xl,
            marginTop: -spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.full,
            ...shadows.small,
        },
        searchInput: {
            flex: 1,
            fontSize: fontSize.base,
            fontFamily: fontFamily.medium,
            color: colors.text,
        },
        content: { flex: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.xl },
        periodRow: { marginBottom: spacing.md },
        periodChip: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.full,
            marginRight: spacing.sm,
        },
        periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        periodChipText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.textLight },
        periodChipTextActive: { color: colors.textWhite },
        addButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.primary,
            marginBottom: spacing.lg,
        },
        addButtonText: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.primary },
        emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
        emptyText: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text, marginTop: spacing.md },
        emptySubtext: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.textLight, marginTop: spacing.xs },
    });
