import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

const DEFAULT_ICON = 'help-circle-outline';

export default function ConfirmSheet({
    visible,
    title,
    message,
    icon = DEFAULT_ICON,
    primaryLabel,
    primaryTone = 'primary',
    onPrimary,
    secondaryLabel,
    secondaryTone = 'neutral',
    onSecondary,
    tertiaryLabel,
    onTertiary,
    onClose,
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    if (!visible) return null;

    const primaryBackground = primaryTone === 'destructive' ? colors.error : colors.primary;
    const secondaryBorder = secondaryTone === 'destructive' ? colors.error : colors.border;
    const secondaryText = secondaryTone === 'destructive' ? colors.error : colors.text;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlayTouch} />
                </TouchableWithoutFeedback>

                <View style={styles.sheet}>
                    <View style={styles.handleBar} />

                    <View style={styles.header}>
                        <View style={styles.iconWrap}>
                            <Ionicons name={icon} size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        {message ? <Text style={styles.message}>{message}</Text> : null}
                    </View>

                    <View style={styles.actions}>
                        {!!primaryLabel && (
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: primaryBackground }]}
                                onPress={onPrimary}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.primaryText}>{primaryLabel}</Text>
                            </TouchableOpacity>
                        )}

                        {!!secondaryLabel && (
                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: secondaryBorder }]}
                                onPress={onSecondary}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.secondaryText, { color: secondaryText }]}>
                                    {secondaryLabel}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {!!tertiaryLabel && (
                            <TouchableOpacity onPress={onTertiary} activeOpacity={0.85}>
                                <Text style={styles.tertiaryText}>{tertiaryLabel}</Text>
                            </TouchableOpacity>
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
            backgroundColor: colors.primaryBg,
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
        tertiaryText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.textLight,
            textAlign: 'center',
            marginTop: spacing.xs,
        },
    });
