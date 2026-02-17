import { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize, fontFamily } from '../constants/theme';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRestart = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            const { colors, t } = this.props;
            const safeColors = colors || {
                background: '#F5FAF8',
                surface: '#FFFFFF',
                text: '#132A2B',
                textLight: '#5C6F70',
                primary: '#0F766E',
                textWhite: '#FFFFFF',
            };
            const title = t?.('somethingWentWrong') || 'Something went wrong';
            const message = t?.('errorBoundaryMessage') || 'An unexpected error occurred. Please try restarting the app.';
            const buttonText = t?.('restartApp') || 'Restart';

            return (
                <View style={[styles.container, { backgroundColor: safeColors.background }]}>
                    <View style={[styles.card, { backgroundColor: safeColors.surface }]}>
                        <Ionicons name="warning-outline" size={56} color={safeColors.primary} />
                        <Text style={[styles.title, { color: safeColors.text }]}>{title}</Text>
                        <Text style={[styles.message, { color: safeColors.textLight }]}>{message}</Text>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: safeColors.primary }]}
                            onPress={this.handleRestart}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.buttonText, { color: safeColors.textWhite }]}>{buttonText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    card: {
        alignItems: 'center',
        padding: spacing.xxl,
        borderRadius: borderRadius.xl,
        width: '100%',
    },
    title: {
        fontSize: fontSize.xxl,
        fontFamily: fontFamily.bold,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    button: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        borderRadius: borderRadius.full,
    },
    buttonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
    },
});
