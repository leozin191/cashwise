import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrencyByCode } from '../constants/currencies';
import { createStyles } from '../screens/homeStyles';
import CategoryIcon from './CategoryIcon';
import { normalizeCategory } from '../constants/categories';

export default function HomeQuickAdd({ quickAddItems, onQuickAdd }) {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (!quickAddItems || quickAddItems.length === 0) return null;

    return (
        <View style={styles.quickAddSection}>
            <View style={styles.quickAddHeader}>
                <Ionicons name="time-outline" size={16} color={colors.text} style={{ marginRight: spacing.sm }} />
                <View style={styles.quickAddHeaderText}>
                    <Text style={styles.quickAddTitle}>{t('quickAdd')}</Text>
                    <Text style={styles.quickAddHint}>{t('quickAddHint')}</Text>
                </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.quickAddRow}>
                    {quickAddItems.map((item) => {
                        const symbol = getCurrencyByCode(item.currency || 'EUR').symbol;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.quickAddChip}
                                onPress={() => onQuickAdd(item)}
                                activeOpacity={0.8}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                    <CategoryIcon
                                        category={normalizeCategory(item.category)}
                                        size={16}
                                        color={colors.primary}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.quickAddChipTitle} numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                        <Text style={styles.quickAddChipAmount}>
                                            {symbol}{Number(item.amount).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}
