import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

export default function ForgotPasswordScreen({ navigation }) {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [step, setStep] = useState('email'); // 'email' | 'reset' | 'done'
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRequestReset = async () => {
        if (!email.trim()) {
            Alert.alert(t('attention') || 'Attention', 'Please enter your email address.');
            return;
        }
        setLoading(true);
        try {
            await authService.forgotPassword(email.trim());
            setStep('reset');
        } catch {
            Alert.alert(t('error') || 'Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!token.trim()) {
            Alert.alert(t('attention') || 'Attention', 'Please enter the reset code from your email.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert(t('attention') || 'Attention', 'Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(t('attention') || 'Attention', 'Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await authService.resetPassword(token.trim(), newPassword);
            setStep('done');
        } catch {
            Alert.alert(t('error') || 'Error', 'Invalid or expired reset code. Please request a new one.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={[colors.primaryGradientStart, colors.primaryGradientEnd]} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={20} color={colors.textLight} />
                        </TouchableOpacity>

                        {step === 'done' ? (
                            <View style={styles.successContainer}>
                                <View style={styles.successIcon}>
                                    <Ionicons name="checkmark" size={32} color={colors.success} />
                                </View>
                                <Text style={styles.title}>{t('passwordUpdated') || 'Password updated!'}</Text>
                                <Text style={styles.subtitle}>
                                    {t('passwordResetSuccess') || 'Your password has been reset. You can now sign in with your new password.'}
                                </Text>
                                <TouchableOpacity style={styles.submitButton} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
                                    <Text style={styles.submitButtonText}>{t('signIn') || 'Sign in'}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : step === 'reset' ? (
                            <>
                                <Text style={styles.title}>{t('setNewPassword') || 'Set new password'}</Text>
                                <Text style={styles.subtitle}>
                                    {t('enterResetCode') || 'Enter the reset code from your email and choose a new password.'}
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('resetCode') || 'Reset code'}</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="key-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder={t('pasteResetCode') || 'Paste code from email'}
                                            placeholderTextColor={colors.textLighter}
                                            value={token}
                                            onChangeText={setToken}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('newPassword') || 'New password'}</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder={t('minChars') || 'At least 8 characters'}
                                            placeholderTextColor={colors.textLighter}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textLight} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('confirmPassword') || 'Confirm password'}</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder={t('repeatPassword') || 'Repeat password'}
                                            placeholderTextColor={colors.textLighter}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {loading ? (t('saving') || 'Saving...') : (t('setNewPassword') || 'Set new password')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setStep('email')} style={styles.switchRow}>
                                    <Text style={styles.switchLink}>{t('requestNewCode') || 'Request a new code'}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.title}>{t('forgotPassword') || 'Forgot password?'}</Text>
                                <Text style={styles.subtitle}>
                                    {t('forgotPasswordSubtitle') || "Enter your email and we'll send you a reset link."}
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('email') || 'Email'}</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="you@example.com"
                                            placeholderTextColor={colors.textLighter}
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleRequestReset}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {loading ? (t('sending') || 'Sending...') : (t('sendResetLink') || 'Send reset link')}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        gradient: { flex: 1 },
        scrollContent: {
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing.xl,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xxl,
            padding: spacing.xl,
            ...shadows.large,
        },
        backButton: {
            alignSelf: 'flex-start',
            marginBottom: spacing.lg,
            padding: spacing.xs,
        },
        title: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
            marginBottom: spacing.xs,
        },
        subtitle: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
            marginBottom: spacing.xl,
            lineHeight: 20,
        },
        inputGroup: {
            marginBottom: spacing.lg,
        },
        label: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: colors.text,
            marginBottom: spacing.sm,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.lg,
        },
        inputIcon: { marginRight: spacing.sm },
        input: {
            flex: 1,
            paddingVertical: spacing.lg,
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.text,
        },
        eyeButton: { padding: spacing.sm },
        submitButton: {
            backgroundColor: colors.primary,
            paddingVertical: spacing.lg,
            borderRadius: borderRadius.lg,
            alignItems: 'center',
            marginTop: spacing.sm,
            ...shadows.small,
        },
        submitButtonDisabled: { opacity: 0.6 },
        submitButtonText: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: colors.textWhite,
        },
        switchRow: {
            alignItems: 'center',
            marginTop: spacing.lg,
        },
        switchLink: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
        successContainer: {
            alignItems: 'center',
            paddingVertical: spacing.lg,
        },
        successIcon: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.successBg || '#ECFDF5',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
        },
    });
