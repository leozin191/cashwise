import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

export default function EditProfileScreen() {
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { colors } = useTheme();
    const { user, updateProfile, deleteAccount } = useAuth();
    const { showSuccess, showError } = useSnackbar();

    const [name, setName] = useState(user?.name || '');
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    const [deleting, setDeleting] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            showError(t('nameRequired'));
            return;
        }
        setSavingProfile(true);
        try {
            await updateProfile(name.trim());
            showSuccess(t('profileUpdated'));
        } catch (error) {
            showError(error?.response?.data?.message || t('error'));
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            showError(t('fillAllFields'));
            return;
        }
        if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
            showError(t('passwordTooShort'));
            return;
        }
        if (newPassword !== confirmNewPassword) {
            showError(t('newPasswordsDoNotMatch'));
            return;
        }
        setSavingPassword(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            showSuccess(t('passwordChanged'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            const msg = error?.response?.data?.message;
            if (msg?.includes('incorrect')) {
                showError(t('currentPasswordWrong'));
            } else {
                showError(msg || t('error'));
            }
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('deleteAccount'),
            t('deleteAccountConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            t('attention'),
                            t('deleteAccountWarning'),
                            [
                                { text: t('cancel'), style: 'cancel' },
                                {
                                    text: t('delete'),
                                    style: 'destructive',
                                    onPress: performDelete,
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const performDelete = async () => {
        if (!deletePassword) {
            showError(t('enterPasswordToConfirm') || 'Enter your password to confirm');
            return;
        }
        setDeleting(true);
        try {
            await deleteAccount(deletePassword);
        } catch (error) {
            showError(error?.response?.data?.message || t('error'));
            setDeleting(false);
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
                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('editProfile')}</Text>
                    <View style={{ width: 34 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="person-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('editProfile')}</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('name')}</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('namePlaceholder')}
                            placeholderTextColor={colors.textLight}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('email')}</Text>
                        <View style={[styles.input, styles.inputDisabled]}>
                            <Text style={styles.inputDisabledText}>{user?.email}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, savingProfile && styles.buttonDisabled]}
                        onPress={handleSaveProfile}
                        disabled={savingProfile}
                    >
                        {savingProfile ? (
                            <ActivityIndicator color={colors.textWhite} size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>{t('save')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="lock-closed-outline" size={18} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.sectionTitle}>{t('changePassword')}</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('currentPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="••••••"
                            placeholderTextColor={colors.textLight}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('newPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="••••••"
                            placeholderTextColor={colors.textLight}
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.passwordHintRow}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textLight} />
                        <Text style={styles.passwordHint}>{t('passwordHint')}</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('confirmNewPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            placeholder="••••••"
                            placeholderTextColor={colors.textLight}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, savingPassword && styles.buttonDisabled]}
                        onPress={handleChangePassword}
                        disabled={savingPassword}
                    >
                        {savingPassword ? (
                            <ActivityIndicator color={colors.textWhite} size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>{t('changePassword')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="warning-outline" size={18} color={colors.error} style={{ marginRight: spacing.sm }} />
                        <Text style={[styles.sectionTitle, { color: colors.error }]}>{t('deleteAccount')}</Text>
                    </View>

                    <TextInput
                        style={[styles.input, { borderColor: colors.error + '60', marginBottom: spacing.md }]}
                        placeholder={t('enterPasswordToConfirm') || 'Enter password to confirm'}
                        placeholderTextColor={colors.textLight}
                        secureTextEntry
                        value={deletePassword}
                        onChangeText={setDeletePassword}
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={[styles.deleteButton, deleting && styles.buttonDisabled]}
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <ActivityIndicator color={colors.textWhite} size="small" />
                        ) : (
                            <View style={styles.deleteButtonContent}>
                                <Ionicons name="trash-outline" size={18} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                <Text style={styles.deleteButtonText}>{t('deleteAccount')}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
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
        passwordHintRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.md,
            marginTop: -spacing.xs,
        },
        passwordHint: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        inputContainer: {
            marginHorizontal: spacing.xl,
            marginBottom: spacing.md,
        },
        inputLabel: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.xs,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.small,
        },
        inputDisabled: {
            opacity: 0.6,
            justifyContent: 'center',
        },
        inputDisabledText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        saveButton: {
            backgroundColor: colors.primary,
            marginHorizontal: spacing.xl,
            marginTop: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            ...shadows.small,
        },
        saveButtonText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textWhite,
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        deleteButton: {
            backgroundColor: colors.error,
            marginHorizontal: spacing.xl,
            marginTop: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            ...shadows.small,
        },
        deleteButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        deleteButtonText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.textWhite,
        },
    });
