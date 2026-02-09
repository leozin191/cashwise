import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import CurrencyDisplay from './CurrencyDisplay';

export default function InstallmentsModal({
    visible,
    title,
    installments = [],
    onClose,
    onDeleteInstallment,
    onEditGroup,
}) {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const styles = createStyles(colors);
    const [pendingDelete, setPendingDelete] = useState(null);

    useEffect(() => {
        if (!visible) {
            setPendingDelete(null);
        }
    }, [visible]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        return date.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const progress = useMemo(() => {
        if (!installments || installments.length === 0) {
            return {
                paidCount: 0,
                totalCount: 0,
                remainingTotal: 0,
                currency: undefined,
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let paidCount = 0;
        let remainingTotal = 0;

        installments.forEach((item) => {
            const date = new Date(item.date);
            if (date < today) {
                paidCount += 1;
            } else {
                remainingTotal += Number(item.amount) || 0;
            }
        });

        const totalCount = Math.max(
            ...installments.map((item) => item._installmentTotal || 0),
            installments.length
        );

        return {
            paidCount,
            totalCount,
            remainingTotal,
            currency: installments[0]?.currency,
        };
    }, [installments]);

    const closeDeleteSheet = () => setPendingDelete(null);

    const confirmDelete = (mode) => {
        if (!pendingDelete || !onDeleteInstallment) return;
        const target = pendingDelete;
        setPendingDelete(null);
        onDeleteInstallment(target, mode);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlayTouch} />
                </TouchableWithoutFeedback>

                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('installmentsTitle')}</Text>
                        <View style={styles.headerActions}>
                            {onEditGroup && installments.length > 0 && (
                                <TouchableOpacity
                                    style={styles.editGroupButton}
                                    onPress={onEditGroup}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                                    <Text style={styles.editGroupText}>{t('editInstallments')}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose}>
                                <Text style={styles.closeButton}>x</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {title ? <Text style={styles.subtitle}>{title}</Text> : null}

                    {installments.length > 0 && (
                        <View style={styles.progressRow}>
                            <Text style={styles.progressText}>
                                {progress.paidCount}/{progress.totalCount} {t('paid')}
                            </Text>
                            <View style={styles.progressRight}>
                                <Text style={styles.progressLabel}>{t('remaining')}:</Text>
                                <CurrencyDisplay
                                    amountInEUR={progress.remainingTotal}
                                    originalCurrency={progress.currency}
                                    style={styles.progressAmount}
                                />
                            </View>
                        </View>
                    )}

                    {installments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="list-outline" size={40} color={colors.textLight} />
                            <Text style={styles.emptyText}>{t('installmentsEmpty')}</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.list}>
                            {installments.map((item) => (
                                <View key={item.id} style={styles.row}>
                                    <View style={styles.rowInfo}>
                                        <Text style={styles.rowTitle}>
                                            {t('installment')} {item._installmentIndex}/{item._installmentTotal}
                                        </Text>
                                        <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                                    </View>
                                    <CurrencyDisplay
                                        amountInEUR={item.amount}
                                        originalCurrency={item.currency}
                                        style={styles.rowAmount}
                                    />
                                    {onDeleteInstallment && (
                                        <TouchableOpacity
                                            onPress={() => setPendingDelete(item)}
                                            style={styles.deleteButton}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            <View style={{ height: spacing.lg }} />
                        </ScrollView>
                    )}
                </View>

                {pendingDelete && (
                    <View style={styles.deleteOverlay}>
                        <TouchableWithoutFeedback onPress={closeDeleteSheet}>
                            <View style={styles.deleteOverlayTouch} />
                        </TouchableWithoutFeedback>
                        <View style={styles.deleteSheet}>
                            <View style={styles.deleteHeader}>
                                <View style={[styles.deleteIconWrap, { backgroundColor: colors.error + '15' }]}>
                                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                                </View>
                                <Text style={styles.deleteTitle}>{t('deleteInstallmentTitle')}</Text>
                                <Text style={styles.deleteMessage}>{t('deleteInstallmentMessage')}</Text>
                            </View>
                            <View style={styles.deleteActions}>
                                <TouchableOpacity
                                    style={[styles.deletePrimaryButton, { backgroundColor: colors.error }]}
                                    onPress={() => confirmDelete('remaining')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.deletePrimaryText}>{t('deleteRemaining')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.deleteSecondaryButton, { borderColor: colors.error }]}
                                    onPress={() => confirmDelete('single')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.deleteSecondaryText, { color: colors.error }]}>
                                        {t('deleteOnlyThis')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={closeDeleteSheet} activeOpacity={0.85}>
                                    <Text style={styles.deleteCancelText}>{t('cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
        },
        overlayTouch: {
            flex: 1,
        },
        sheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: borderRadius.xxxl,
            borderTopRightRadius: borderRadius.xxxl,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xl,
            maxHeight: '80%',
            ...shadows.large,
        },
        handleBar: {
            width: 40,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: spacing.md,
            marginBottom: spacing.lg,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
        },
        headerActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        title: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        editGroupButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
            backgroundColor: colors.primaryBg,
        },
        editGroupText: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
            marginLeft: spacing.xs,
        },
        closeButton: {
            fontSize: fontSize.huge,
            color: colors.textLight,
            fontWeight: '300',
        },
        subtitle: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
            marginBottom: spacing.md,
        },
        progressRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.background,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            marginBottom: spacing.md,
        },
        progressText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        progressRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
        },
        progressLabel: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        progressAmount: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
        },
        list: {
            marginTop: spacing.sm,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.sm,
        },
        rowInfo: {
            flex: 1,
        },
        rowTitle: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.xs,
        },
        rowDate: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        rowAmount: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.bold,
            color: colors.text,
            marginRight: spacing.sm,
        },
        deleteButton: {
            width: 32,
            height: 32,
            borderRadius: borderRadius.full,
            backgroundColor: colors.error + '1A',
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyState: {
            alignItems: 'center',
            paddingVertical: spacing.xxl,
        },
        emptyText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.medium,
            color: colors.textLight,
            marginTop: spacing.sm,
        },
        deleteOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'flex-end',
        },
        deleteOverlayTouch: {
            flex: 1,
        },
        deleteSheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: borderRadius.xxxl,
            borderTopRightRadius: borderRadius.xxxl,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xxl,
            paddingTop: spacing.md,
            ...shadows.large,
        },
        deleteHeader: {
            alignItems: 'center',
            paddingBottom: spacing.lg,
        },
        deleteIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
        },
        deleteTitle: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
            textAlign: 'center',
            marginBottom: spacing.sm,
        },
        deleteMessage: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
            textAlign: 'center',
            lineHeight: 20,
        },
        deleteActions: {
            gap: spacing.sm,
        },
        deletePrimaryButton: {
            paddingVertical: spacing.md,
            borderRadius: borderRadius.lg,
            alignItems: 'center',
        },
        deletePrimaryText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textWhite,
        },
        deleteSecondaryButton: {
            paddingVertical: spacing.md,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            alignItems: 'center',
            backgroundColor: colors.surface,
        },
        deleteSecondaryText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
        },
        deleteCancelText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.textLight,
            textAlign: 'center',
            marginTop: spacing.xs,
        },
    });
