import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/api';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

const DEBOUNCE_MS = 500;

export default function ChooseUsernameScreen() {
    const { setUsername, user } = useAuth();
    const { t } = useLanguage();
    const { colors } = useTheme();

    const [value, setValue] = useState('');
    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState(null); // null | true | false | 'error'
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        setAvailable(null);
        if (value.length < 3) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setChecking(true);
            try {
                const result = await authService.checkUsername(value);
                setAvailable(result.available);
            } catch {
                setAvailable('error');
            } finally {
                setChecking(false);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(debounceRef.current);
    }, [value]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await setUsername(value);
        } catch (e) {
            const msg = e?.response?.data?.message;
            if (msg?.includes('already taken')) {
                setAvailable(false);
            } else {
                Alert.alert(t('error'), t('somethingWentWrong'));
            }
        } finally {
            setLoading(false);
        }
    };

    // Allow submit if check says available, or if check failed (server will validate)
    const canSubmit = value.length >= 3 && available !== false && !checking && !loading;

    const getStatusIcon = () => {
        if (value.length < 3) return null;
        if (checking) return <ActivityIndicator size="small" color={colors.primary} />;
        if (available === true) return <Ionicons name="checkmark-circle" size={20} color="#38a169" />;
        if (available === false) return <Ionicons name="close-circle" size={20} color={colors.error || '#e53e3e'} />;
        return null;
    };

    const getStatusText = () => {
        if (value.length < 3) return null;
        if (checking) return { text: t('checkingUsername'), color: colors.textLight };
        if (available === true) return { text: t('usernameAvailable'), color: '#38a169' };
        if (available === false) return { text: t('usernameTaken'), color: colors.error || '#e53e3e' };
        return null;
    };

    const styles = createStyles(colors);
    const status = getStatusText();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Ionicons name="at-circle" size={52} color={colors.textWhite} />
                <Text style={styles.headerTitle}>{t('chooseUsernameTitle')}</Text>
                <Text style={styles.headerSubtitle}>{t('chooseUsernameSubtitle')}</Text>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formWrapper}
            >
                <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.welcomeText}>
                        {t('welcomeBack')}, {user?.name}!
                    </Text>

                    <View style={[
                        styles.inputContainer,
                        available === false && styles.inputError,
                        available === true && styles.inputSuccess,
                    ]}>
                        <Text style={styles.atPrefix}>@</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('usernamePlaceholder').replace('@', '')}
                            placeholderTextColor={colors.textLight}
                            value={value}
                            onChangeText={(v) => setValue(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoFocus
                            maxLength={30}
                        />
                        <View style={styles.statusIcon}>{getStatusIcon()}</View>
                    </View>

                    {status && (
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textWhite} />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('confirmUsername')}</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        paddingTop: 80,
        paddingBottom: spacing.xxl + spacing.lg,
        alignItems: 'center',
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
        gap: spacing.md,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
        marginTop: spacing.sm,
    },
    headerSubtitle: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    formWrapper: { flex: 1 },
    formContent: { padding: spacing.xl, paddingTop: spacing.xxl },
    welcomeText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xs,
        ...shadows.small,
    },
    inputError: { borderColor: '#e53e3e' },
    inputSuccess: { borderColor: '#38a169' },
    atPrefix: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.primary,
        marginRight: spacing.xs,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.lg,
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        color: colors.text,
    },
    statusIcon: { marginLeft: spacing.sm },
    statusText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...shadows.small,
    },
    submitButtonDisabled: { opacity: 0.4 },
    submitButtonText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
});
