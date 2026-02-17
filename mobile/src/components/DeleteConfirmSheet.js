import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

export default function DeleteConfirmSheet({
    visible,
    isInstallment = false,
    onClose,
    onDelete,
    onDeleteSingle,
    onDeleteRemaining,
    title,
    message,
}) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const styles = createStyles(colors);

    if (!visible) return null;

    const titleText = title || (isInstallment ? t('deleteInstallmentTitle') : t('delete'));
    const messageText = message || (isInstallment ? t('deleteInstallmentMessage') : t('deleteConfirm'));

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlayTouch} />
                </TouchableWithoutFeedback>

                <View style={styles.sheet}>
                    <View style={styles.handleBar} />

                    <View style={styles.header}>
                        <View style={[styles.iconWrap, { backgroundColor: colors.errorBg }]}>
                            <Ionicons name="trash-outline" size={22} color={colors.error} />
                        </View>
                        <Text style={styles.title}>{titleText}</Text>
                        {messageText ? <Text style={styles.message}>{messageText}</Text> : null}
                    </View>

                    <View style={styles.actions}>
                        {isInstallment ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.primaryButton, { backgroundColor: colors.error }]}
                                    onPress={onDeleteRemaining}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.primaryText}>{t('deleteRemaining')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.secondaryButton, { borderColor: colors.error }]}
                                    onPress={onDeleteSingle}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.secondaryText, { color: colors.error }]}>
                                        {t('deleteOnlyThis')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
                                    <Text style={styles.cancelText}>{t('cancel')}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.primaryButton, { backgroundColor: colors.error }]}
                                    onPress={onDelete}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.primaryText}>{t('delete')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                                    onPress={onClose}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.secondaryText, { color: colors.text }]}>
                                        {t('cancel')}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: colors.overlay,
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
            paddingBottom: spacing.xxl,
            paddingTop: spacing.md,
            ...shadows.large,
        },
        handleBar: {
            width: 40,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: spacing.lg,
        },
        header: {
            alignItems: 'center',
            paddingBottom: spacing.lg,
        },
        iconWrap: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
        },
        title: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
            textAlign: 'center',
            marginBottom: spacing.sm,
        },
        message: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
            textAlign: 'center',
            lineHeight: 20,
        },
        actions: {
            gap: spacing.sm,
        },
        primaryButton: {
            paddingVertical: spacing.md,
            borderRadius: borderRadius.lg,
            alignItems: 'center',
        },
        primaryText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textWhite,
        },
        secondaryButton: {
            paddingVertical: spacing.md,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            alignItems: 'center',
            backgroundColor: colors.surface,
        },
        secondaryText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
        },
        cancelText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.textLight,
            textAlign: 'center',
            marginTop: spacing.xs,
        },
    });
