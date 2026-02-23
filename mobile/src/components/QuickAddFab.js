import { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import AddExpenseModal from './AddExpenseModal';
import AddIncomeModal from './AddIncomeModal';
import { emitDataChanged } from '../services/dataEvents';

export default function QuickAddFab({ navigationRef }) {
    const { colors } = useTheme();
    const { t } = useLanguage();

    const [open, setOpen] = useState(false);
    const [showExpense, setShowExpense] = useState(false);
    const [showIncome, setShowIncome] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(animation, {
            toValue: open ? 1 : 0,
            damping: 16,
            stiffness: 220,
            mass: 0.7,
            useNativeDriver: true,
        }).start();
    }, [animation, open]);

    const handleOpenExpense = () => {
        setOpen(false);
        setShowExpense(true);
    };

    const handleOpenIncome = () => {
        setOpen(false);
        setShowIncome(true);
    };

    const handleOpenSubscription = () => {
        setOpen(false);
        if (navigationRef?.current?.navigate) {
            navigationRef.current.navigate('Subscriptions', { openAdd: true });
        }
    };

    const styles = createStyles(colors);
    const actionsAnimatedStyle = {
        opacity: animation,
        transform: [
            {
                translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                }),
            },
            {
                scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                }),
            },
        ],
    };

    const fabAnimatedStyle = {
        transform: [
            {
                scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.96],
                }),
            },
            {
                rotate: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                }),
            },
        ],
    };

    return (
        <>
            {open && (
                <TouchableWithoutFeedback onPress={() => setOpen(false)}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>
            )}

            <View pointerEvents="box-none" style={styles.container}>
                <Animated.View
                    pointerEvents={open ? 'auto' : 'none'}
                    style={[styles.actions, actionsAnimatedStyle]}
                >
                    <TouchableOpacity style={styles.action} onPress={handleOpenExpense} accessibilityLabel={t('addExpense')} accessibilityRole="button">
                        <Ionicons name="card" size={18} color={colors.textWhite} />
                        <Text style={styles.actionText}>{t('addExpense')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.action} onPress={handleOpenIncome} accessibilityLabel={t('addIncome')} accessibilityRole="button">
                        <Ionicons name="cash" size={18} color={colors.textWhite} />
                        <Text style={styles.actionText}>{t('addIncome')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.action} onPress={handleOpenSubscription} accessibilityLabel={t('addSubscription')} accessibilityRole="button">
                        <Ionicons name="repeat" size={18} color={colors.textWhite} />
                        <Text style={styles.actionText}>{t('addSubscription')}</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={fabAnimatedStyle}>
                    <TouchableOpacity
                        style={[styles.fab, open && styles.fabOpen]}
                        onPress={() => setOpen((prev) => !prev)}
                        activeOpacity={0.85}
                        accessibilityLabel={open ? t('cancel') : t('quickAdd')}
                        accessibilityRole="button"
                    >
                        <Ionicons name="add" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <AddExpenseModal
                visible={showExpense}
                onClose={() => setShowExpense(false)}
                onSuccess={() => {
                    setShowExpense(false);
                    emitDataChanged({ type: 'expenses' });
                }}
            />
            <AddIncomeModal
                visible={showIncome}
                onClose={() => setShowIncome(false)}
                onSuccess={() => {
                    setShowIncome(false);
                    emitDataChanged({ type: 'incomes' });
                }}
            />
        </>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        container: {
            position: 'absolute',
            right: spacing.xl,
            bottom: 90,
            alignItems: 'flex-end',
        },
        overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.overlayLight,
        },
        actions: {
            marginBottom: spacing.md,
            gap: spacing.sm,
            alignItems: 'flex-end',
        },
        action: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.primary,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.full,
            ...shadows.medium,
        },
        actionText: {
            color: colors.textWhite,
            fontFamily: fontFamily.semibold,
            fontSize: fontSize.sm,
        },
        fab: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadows.colored,
        },
        fabOpen: {
            backgroundColor: colors.error,
        },
    });
