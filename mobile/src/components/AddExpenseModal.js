import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { expenseService } from '../services/api';
import { CATEGORIES, getCategoryEmoji, getCategoryColor } from '../constants/categories';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

export default function AddExpenseModal({ visible, onClose, onSuccess, expenseToEdit = null }) {
    const { t } = useLanguage();

    const [description, setDescription] = useState(expenseToEdit?.description || '');
    const [amount, setAmount] = useState(expenseToEdit?.amount?.toString() || '');
    const [category, setCategory] = useState(expenseToEdit?.category || '');
    const [saving, setSaving] = useState(false);


    const handleSave = async () => {
        if (!description.trim()) {
            Alert.alert(t('attention'), t('enterDescription'));
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert(t('attention'), t('enterValidAmount'));
            return;
        }

        try {
            setSaving(true);
            const expenseData = {
                description: description.trim(),
                amount: parseFloat(amount),
                currency: 'EUR',
                date: expenseToEdit?.date || new Date().toISOString().split('T')[0],
                ...(category && { category }),
            };

            if (expenseToEdit) {
                await expenseService.update(expenseToEdit.id, expenseData);
                Alert.alert(`✅ ${t('success')}`, t('expenseUpdated'), [
                    { text: 'OK', onPress: handleClose }
                ]);
            } else {
                const result = await expenseService.create(expenseData);

                if (!category && result.category) {
                    Alert.alert(
                        `✨ ${t('success')}`,
                        `${t('expenseAdded')}\n${t('aiCategorized')} ${t(`categories.${result.category}`)}`,
                        [{ text: 'OK', onPress: handleClose }]
                    );
                } else {
                    Alert.alert(`✅ ${t('success')}`, t('expenseAdded'), [
                        { text: 'OK', onPress: handleClose }
                    ]);
                }
            }

            onSuccess();
        } catch (error) {
            Alert.alert(t('error'), t('couldNotSave'));
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setAmount('');
        setCategory('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {expenseToEdit ? t('editExpense') : t('newExpense')}
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Conteúdo */}
                    <ScrollView style={styles.content}>
                        {/* Banner da IA */}
                        <View style={styles.aiBanner}>
                            <Text style={styles.aiBannerEmoji}>✨</Text>
                            <Text style={styles.aiBannerText}>
                                {t('aiBanner')}
                            </Text>
                        </View>

                        {/* Campo Descrição */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('description')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('descriptionPlaceholder')}
                                placeholderTextColor={colors.textLighter}
                                value={description}
                                onChangeText={setDescription}
                                autoFocus
                            />
                        </View>

                        {/* Campo Valor */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('amount')}</Text>
                            <View style={styles.amountContainer}>
                                <Text style={styles.currencySymbol}>€</Text>
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

                        {/* Categorias */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('categoryOptional')}</Text>
                            <View style={styles.categoriesGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            category === cat && {
                                                backgroundColor: getCategoryColor(cat),
                                                borderColor: getCategoryColor(cat),
                                            },
                                        ]}
                                        onPress={() => setCategory(category === cat ? '' : cat)}
                                    >
                                        <Text style={styles.categoryEmoji}>
                                            {getCategoryEmoji(cat)}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.categoryText,
                                                category === cat && styles.categoryTextSelected,
                                            ]}
                                        >
                                            {t(`categories.${cat}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Botão Salvar */}
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving
                                    ? t('saving')
                                    : expenseToEdit
                                        ? `💾 ${t('saveChanges')}`
                                        : `✨ ${t('addExpense')}`
                                }
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxxl,
        borderTopRightRadius: borderRadius.xxxl,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    closeButton: {
        fontSize: fontSize.huge,
        color: colors.textLight,
        fontWeight: fontWeight.light,
    },
    content: {
        padding: spacing.xl,
    },
    aiBanner: {
        flexDirection: 'row',
        backgroundColor: colors.primaryBg,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xxl,
        alignItems: 'center',
    },
    aiBannerEmoji: {
        fontSize: fontSize.xxxl,
        marginRight: spacing.md,
    },
    aiBannerText: {
        flex: 1,
        fontSize: fontSize.sm + 1,
        color: colors.primary,
        lineHeight: 18,
    },
    inputGroup: {
        marginBottom: spacing.xxl,
    },
    label: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        fontSize: fontSize.lg,
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
    currencySymbol: {
        fontSize: fontSize.xl + 2,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
        marginRight: spacing.sm,
    },
    amountInput: {
        flex: 1,
        padding: spacing.lg,
        fontSize: fontSize.xl + 2,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    categoryEmoji: {
        fontSize: fontSize.xl,
        marginRight: spacing.xs + 2,
    },
    categoryText: {
        fontSize: fontSize.sm + 1,
        color: colors.textLight,
        fontWeight: fontWeight.medium,
    },
    categoryTextSelected: {
        color: colors.textWhite,
        fontWeight: fontWeight.semibold,
    },
    saveButton: {
        backgroundColor: colors.primary,
        padding: spacing.xl - 2,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xxxl,
        ...shadows.colored,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: colors.textWhite,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
    },
});