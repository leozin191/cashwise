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
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

export default function RegisterScreen({ navigation }) {
    const { register } = useAuth();
    const { t } = useLanguage();
    const { colors } = useTheme();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        if (!name.trim() || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert(t('error'), t('fillAllFields'));
            return;
        }

        if (!/^[a-z0-9_]{3,30}$/.test(username.trim())) {
            Alert.alert(t('error'), t('usernameInvalid'));
            return;
        }

        if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
            Alert.alert(t('error'), t('passwordTooShort'));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t('error'), t('passwordsDoNotMatch'));
            return;
        }

        setLoading(true);
        try {
            await register(name.trim(), email.trim(), password, username.trim());
        } catch (error) {
            const status = error?.response?.status;
            if (status === 409) {
                Alert.alert(t('error'), t('emailAlreadyExists'));
            } else {
                Alert.alert(t('error'), t('registrationFailed'));
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
                    <Text style={styles.formTitle}>{t('register')}</Text>

                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('namePlaceholder')}
                            placeholderTextColor={colors.textLight}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            accessibilityLabel={t('name')}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="at-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('usernamePlaceholder')}
                            placeholderTextColor={colors.textLight}
                            value={username}
                            onChangeText={(v) => setUsername(v.toLowerCase())}
                            autoCapitalize="none"
                            autoCorrect={false}
                            accessibilityLabel={t('username')}
                        />
                    </View>

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
                    <View style={styles.passwordHintRow}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textLight} />
                        <Text style={styles.passwordHint}>{t('passwordHint')}</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('confirmPasswordPlaceholder')}
                            placeholderTextColor={colors.textLight}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                            accessibilityLabel={t('confirmPassword')}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.8}
                        accessibilityLabel={t('register')}
                        accessibilityRole="button"
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textWhite} />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('register')}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.switchRow}>
                        <Text style={styles.switchText}>{t('hasAccount')} </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityLabel={t('loginHere')} accessibilityRole="link">
                            <Text style={styles.switchLink}>{t('loginHere')}</Text>
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
        passwordHintRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
            marginTop: -spacing.sm,
            paddingHorizontal: spacing.sm,
        },
        passwordHint: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.regular,
            color: colors.textLight,
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
