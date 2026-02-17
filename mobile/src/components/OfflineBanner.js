import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';

export default function OfflineBanner({ message }) {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
        <View style={styles.container}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.warningBg,
            borderWidth: 1,
            borderColor: colors.warning + '55',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.lg,
            marginHorizontal: spacing.xl,
            marginTop: spacing.sm,
            ...shadows.small,
        },
        text: {
            flex: 1,
            fontSize: fontSize.sm,
            fontFamily: fontFamily.medium,
            color: colors.text,
        },
    });
