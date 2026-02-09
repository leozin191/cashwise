import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

export default function InstallmentGroupsModal({ visible, groups = [], onClose, onSelectGroup }) {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const styles = createStyles(colors);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const locale = language === 'pt' ? 'pt-BR' : 'en-US';
        return date.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
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
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeButton}>x</Text>
                        </TouchableOpacity>
                    </View>

                    {groups.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="list-outline" size={40} color={colors.textLight} />
                            <Text style={styles.emptyText}>{t('installmentsEmpty')}</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.list}>
                            {groups.map((group) => (
                                <TouchableOpacity
                                    key={group.key}
                                    style={styles.row}
                                    onPress={() => onSelectGroup(group)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.rowInfo}>
                                        <Text style={styles.rowTitle}>{group.title}</Text>
                                        <Text style={styles.rowSubtext}>
                                            {t('installmentsTitle')}: {group.totalCount} - {t('nextCharge')}: {formatDate(group.nextDate)}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                                </TouchableOpacity>
                            ))}
                            <View style={{ height: spacing.lg }} />
                        </ScrollView>
                    )}
                </View>
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
        title: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
        },
        closeButton: {
            fontSize: fontSize.huge,
            color: colors.textLight,
            fontWeight: '300',
        },
        list: {
            marginTop: spacing.sm,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.sm,
        },
        rowInfo: {
            flex: 1,
            marginRight: spacing.sm,
        },
        rowTitle: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.xs,
        },
        rowSubtext: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
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
    });
