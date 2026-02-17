import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

const SnackbarContext = createContext(null);
const DEFAULT_DURATION = 2500;

const getAppearance = (colors, type) => {
    const palette = {
        success: {
            background: colors.success,
            text: colors.textWhite,
            icon: 'checkmark-circle',
        },
        error: {
            background: colors.error,
            text: colors.textWhite,
            icon: 'alert-circle',
        },
        info: {
            background: colors.primary,
            text: colors.textWhite,
            icon: 'information-circle',
        },
    };

    return palette[type] || palette.success;
};

export const SnackbarProvider = ({ children }) => {
    const { colors } = useTheme();
    const [snackbar, setSnackbar] = useState(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;
    const timeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const hide = () => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 16,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setSnackbar(null);
        });
    };

    const showSnackbar = ({ message, type = 'success', duration = DEFAULT_DURATION }) => {
        if (!message) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setSnackbar({ message, type });
        opacity.setValue(0);
        translateY.setValue(16);

        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();

        timeoutRef.current = setTimeout(hide, duration);
    };

    const showSuccess = (message, duration) => {
        showSnackbar({ message, type: 'success', duration });
    };

    const showError = (message, duration) => {
        showSnackbar({ message, type: 'error', duration });
    };

    const styles = createStyles(colors);
    const appearance = getAppearance(colors, snackbar?.type);

    return (
        <SnackbarContext.Provider value={{ showSnackbar, showSuccess, showError }}>
            {children}
            {snackbar && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.container,
                        { opacity, transform: [{ translateY }] },
                    ]}
                >
                    <View style={[styles.snackbar, { backgroundColor: appearance.background }]}>
                        <Ionicons name={appearance.icon} size={18} color={appearance.text} />
                        <Text style={[styles.text, { color: appearance.text }]}>
                            {snackbar.message}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => {
    const context = useContext(SnackbarContext);
    if (!context) {
        throw new Error('useSnackbar must be used within SnackbarProvider');
    }
    return context;
};

const createStyles = (colors) =>
    StyleSheet.create({
        container: {
            position: 'absolute',
            left: spacing.xl,
            right: spacing.xl,
            bottom: 84,
            zIndex: 9999,
        },
        snackbar: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.lg,
            gap: spacing.sm,
            ...shadows.medium,
        },
        text: {
            flex: 1,
            fontSize: fontSize.sm + 1,
            fontFamily: fontFamily.semibold,
        },
    });
