import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

const REMEMBER_KEY = 'cashwise_remember_credentials';
const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_OFFERED_KEY = '@biometric_offered';
const SECURE_EMAIL_KEY = 'cashwise_bio_email';
const SECURE_PASSWORD_KEY = 'cashwise_bio_password';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const { t } = useLanguage();
    const { colors } = useTheme();
    const { showSuccess } = useSnackbar();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const biometricAttempted = useRef(false);

    useEffect(() => {
        loadSavedCredentials();
        attemptBiometricLogin();
    }, []);

    const loadSavedCredentials = async () => {
        try {
            // Migrate old plain-text credentials to SecureStore
            const legacyRaw = await AsyncStorage.getItem('@remember_credentials');
            if (legacyRaw) {
                try {
                    const parsed = JSON.parse(legacyRaw);
                    if (parsed?.email && parsed?.password) {
                        await SecureStore.setItemAsync(REMEMBER_KEY, legacyRaw);
                    }
                } catch { /* corrupted, ignore */ }
                await AsyncStorage.removeItem('@remember_credentials');
            }

            const raw = await SecureStore.getItemAsync(REMEMBER_KEY);
            if (raw) {
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                } catch {
                    await SecureStore.deleteItemAsync(REMEMBER_KEY);
                    return;
                }
                if (parsed?.email && parsed?.password) {
                    setEmail(parsed.email);
                    setPassword(parsed.password);
                    setRememberMe(true);
                }
            }
        } catch (error) {
            console.error('Load saved credentials error:', error);
        }
    };

    const attemptBiometricLogin = async () => {
        if (biometricAttempted.current) return;
        biometricAttempted.current = true;

        try {
            const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
            if (biometricEnabled !== 'true') return;

            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) return;

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: t('biometricLogin'),
                cancelLabel: t('cancel'),
                disableDeviceFallback: false,
            });

            if (result.success) {
                const storedEmail = await SecureStore.getItemAsync(SECURE_EMAIL_KEY);
                const storedPassword = await SecureStore.getItemAsync(SECURE_PASSWORD_KEY);

                if (storedEmail && storedPassword) {
                    setLoading(true);
                    try {
                        const response = await login(storedEmail, storedPassword);
                        showSuccess(t('welcomeBack') + ', ' + response.name);
                    } catch (error) {
                        await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
                        await SecureStore.deleteItemAsync(SECURE_EMAIL_KEY);
                        await SecureStore.deleteItemAsync(SECURE_PASSWORD_KEY);
                        Alert.alert(t('error'), t('invalidCredentials'));
                    } finally {
                        setLoading(false);
                    }
                }
            }
        } catch (error) {
            console.error('Biometric login error:', error);
        }
    };

    const offerBiometricSetup = async (userEmail, userPassword, userName) => {
        try {
            const alreadyOffered = await AsyncStorage.getItem(BIOMETRIC_OFFERED_KEY);
            if (alreadyOffered === 'true') return;

            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) return;

            await AsyncStorage.setItem(BIOMETRIC_OFFERED_KEY, 'true');

            Alert.alert(
                t('enableBiometric'),
                t('enableBiometricPrompt'),
                [
                    { text: t('cancel'), style: 'cancel' },
                    {
                        text: t('yes'),
                        onPress: async () => {
                            await SecureStore.setItemAsync(SECURE_EMAIL_KEY, userEmail);
                            await SecureStore.setItemAsync(SECURE_PASSWORD_KEY, userPassword);
                            await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
                            showSuccess(t('biometricEnabled'));
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Biometric setup error:', error);
        }
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }

        setLoading(true);
        try {
            const response = await login(email.trim(), password);

            if (rememberMe) {
                await SecureStore.setItemAsync(REMEMBER_KEY, JSON.stringify({ email: email.trim(), password }));
            } else {
                await SecureStore.deleteItemAsync(REMEMBER_KEY);
            }

            showSuccess(t('welcomeBack') + ', ' + response.name);

            offerBiometricSetup(email.trim(), password, response.name);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                Alert.alert(t('error'), t('invalidCredentials'));
            } else {
                Alert.alert(t('error'), t('loginFailed'));
            }
        } finally {
            setLoading(false);
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
                <Ionicons name="wallet" size={48} color={colors.textWhite} />
                <Text style={styles.headerTitle}>{t('welcome')}</Text>
                <Text style={styles.headerAppName}>{t('appName')}</Text>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formWrapper}
            >
                <ScrollView
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.formTitle}>{t('login')}</Text>

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('emailPlaceholderAuth')}
                            placeholderTextColor={colors.textLight}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            accessibilityLabel={t('email')}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('passwordPlaceholder')}
                            placeholderTextColor={colors.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            accessibilityLabel={t('password')}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textLight} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.rememberRow}
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={rememberMe ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={rememberMe ? colors.primary : colors.textLight}
                        />
                        <Text style={styles.rememberText}>{t('rememberMe')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                        accessibilityLabel={t('login')}
                        accessibilityRole="button"
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textWhite} />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('login')}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.switchRow}>
                        <Text style={styles.switchText}>{t('noAccount')} </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityLabel={t('registerHere')} accessibilityRole="link">
                            <Text style={styles.switchLink}>{t('registerHere')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
            paddingTop: 80,
            paddingBottom: spacing.xxl + spacing.lg,
            alignItems: 'center',
            borderBottomLeftRadius: borderRadius.xxl,
            borderBottomRightRadius: borderRadius.xxl,
        },
        headerTitle: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.medium,
            color: colors.textWhite,
            marginTop: spacing.lg,
        },
        headerAppName: {
            fontSize: fontSize.xxxl,
            fontFamily: fontFamily.bold,
            color: colors.textWhite,
        },
        formWrapper: {
            flex: 1,
        },
        formContent: {
            padding: spacing.xl,
            paddingTop: spacing.xxl,
        },
        formTitle: {
            fontSize: fontSize.xxl,
            fontFamily: fontFamily.bold,
            color: colors.text,
            marginBottom: spacing.xl,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.lg,
            ...shadows.small,
        },
        inputIcon: {
            marginRight: spacing.sm,
        },
        input: {
            flex: 1,
            paddingVertical: spacing.lg,
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.text,
        },
        eyeButton: {
            padding: spacing.sm,
        },
        rememberRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing.sm,
        },
        rememberText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.medium,
            color: colors.text,
            marginLeft: spacing.sm,
        },
        submitButton: {
            backgroundColor: colors.primary,
            paddingVertical: spacing.lg,
            borderRadius: borderRadius.lg,
            alignItems: 'center',
            marginTop: spacing.lg,
            ...shadows.small,
        },
        submitButtonDisabled: {
            opacity: 0.6,
        },
        submitButtonText: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: colors.textWhite,
        },
        switchRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: spacing.xl,
        },
        switchText: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
        },
        switchLink: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.semibold,
            color: colors.primary,
        },
    });
