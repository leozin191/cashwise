import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, borderRadius, fontSize, fontFamily } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@onboarding_completed';

const SLIDES = [
    {
        key: 'welcome',
        icon: 'wallet',
        titleKey: 'onboardingWelcome',
        descKey: 'onboardingSubtitle',
        gradient: ['#6366F1', '#4F46E5'],
    },
    {
        key: 'expenses',
        icon: 'receipt-outline',
        titleKey: 'onboardingExpensesTitle',
        descKey: 'onboardingExpensesDesc',
        gradient: ['#6366F1', '#7C3AED'],
        preview: [
            { icon: 'fast-food', label: 'Food', amount: '€12.50', color: '#EF4444' },
            { icon: 'car', label: 'Transport', amount: '€8.00', color: '#3B82F6' },
            { icon: 'cart', label: 'Shopping', amount: '€45.90', color: '#EC4899' },
        ],
    },
    {
        key: 'budgets',
        icon: 'flag-outline',
        titleKey: 'onboardingBudgetsTitle',
        descKey: 'onboardingBudgetsDesc',
        gradient: ['#7C3AED', '#6D28D9'],
        budgets: [
            { label: 'Food', percent: 0.65, color: '#EF4444' },
            { label: 'Transport', percent: 0.30, color: '#3B82F6' },
            { label: 'Entertainment', percent: 0.85, color: '#F59E0B' },
        ],
    },
    {
        key: 'incomes',
        icon: 'cash-outline',
        titleKey: 'onboardingIncomesTitle',
        descKey: 'onboardingIncomesDesc',
        gradient: ['#059669', '#047857'],
        preview: [
            { icon: 'briefcase', label: 'Salary', amount: '€2,500', color: '#22C55E' },
            { icon: 'code-slash', label: 'Freelance', amount: '€800', color: '#3B82F6' },
        ],
    },
    {
        key: 'subscriptions',
        icon: 'repeat-outline',
        titleKey: 'onboardingSubscriptionsTitle',
        descKey: 'onboardingSubscriptionsDesc',
        gradient: ['#DC2626', '#B91C1C'],
        preview: [
            { icon: 'musical-notes', label: 'Spotify', amount: '€9.99/mo', color: '#22C55E' },
            { icon: 'film', label: 'Netflix', amount: '€13.99/mo', color: '#EF4444' },
            { icon: 'cloud', label: 'iCloud', amount: '€2.99/mo', color: '#3B82F6' },
        ],
    },
];

export default function OnboardingScreen({ onFinish }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const flatListRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);

    const cardAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        cardAnim.setValue(0);
        Animated.spring(cardAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, [currentPage]);

    const completeOnboarding = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        onFinish();
    };

    const handleNext = () => {
        if (currentPage < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
        } else {
            completeOnboarding();
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentPage(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const slide = SLIDES[currentPage];
    const isLast = currentPage === SLIDES.length - 1;
    const styles = createStyles(colors);

    const renderPreviewCard = (slideData) => {
        if (!slideData.preview && !slideData.budgets) return null;

        return (
            <Animated.View
                style={[
                    styles.previewCard,
                    {
                        opacity: cardAnim,
                        transform: [{
                            translateY: cardAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [40, 0],
                            }),
                        }],
                    },
                ]}
            >
                {slideData.preview && slideData.preview.map((item, idx) => (
                    <View key={idx} style={[styles.previewRow, idx < slideData.preview.length - 1 && styles.previewRowBorder]}>
                        <View style={[styles.previewIcon, { backgroundColor: item.color }]}>
                            <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                        </View>
                        <Text style={styles.previewLabel}>{item.label}</Text>
                        <Text style={styles.previewAmount}>{item.amount}</Text>
                    </View>
                ))}

                {slideData.budgets && slideData.budgets.map((budget, idx) => (
                    <View key={idx} style={[styles.budgetRow, idx < slideData.budgets.length - 1 && { marginBottom: spacing.lg }]}>
                        <View style={styles.budgetHeader}>
                            <View style={styles.budgetLabelRow}>
                                <View style={[styles.budgetDot, { backgroundColor: budget.color }]} />
                                <Text style={styles.budgetLabel}>{budget.label}</Text>
                            </View>
                            <Text style={[styles.budgetPercent, budget.percent > 0.8 && { color: '#F59E0B' }]}>
                                {Math.round(budget.percent * 100)}%
                            </Text>
                        </View>
                        <View style={styles.progressBg}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${budget.percent * 100}%`,
                                        backgroundColor: budget.percent > 0.8 ? '#F59E0B' : budget.color,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                ))}
            </Animated.View>
        );
    };

    const renderSlide = ({ item: slideData, index }) => (
        <View style={styles.slide}>
            <LinearGradient
                colors={slideData.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {index < SLIDES.length - 1 ? (
                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={completeOnboarding}
                        accessibilityLabel={t('onboardingSkip')}
                        accessibilityRole="button"
                    >
                        <Text style={styles.skipText}>{t('onboardingSkip')}</Text>
                    </TouchableOpacity>
                ) : null}

                <View style={styles.contentArea}>
                    <View style={styles.centerBlock}>
                        <View style={slideData.key === 'welcome' ? styles.iconCircleLg : styles.iconCircleSm}>
                            <Ionicons
                                name={slideData.icon}
                                size={slideData.key === 'welcome' ? 56 : 32}
                                color="#FFFFFF"
                            />
                        </View>

                        <Text style={styles.title}>{t(slideData.titleKey)}</Text>
                        <Text style={styles.description}>{t(slideData.descKey)}</Text>

                        {renderPreviewCard(slideData)}

                        {slideData.key === 'welcome' ? (
                            <Text style={styles.letsGo}>{t('onboardingLetsGo')}</Text>
                        ) : null}
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            />

            <View style={styles.bottom}>
                <View style={styles.dots}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[styles.dot, index === currentPage && styles.dotActive]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={handleNext}
                    activeOpacity={0.85}
                    accessibilityLabel={isLast ? t('onboardingGetStarted') : t('onboardingNext')}
                    accessibilityRole="button"
                >
                    <LinearGradient
                        colors={slide.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextBtnInner}
                    >
                        <Text style={styles.nextBtnText}>
                            {isLast ? t('onboardingGetStarted') : t('onboardingNext')}
                        </Text>
                        {!isLast && (
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

OnboardingScreen.ONBOARDING_KEY = ONBOARDING_KEY;

const BOTTOM_HEIGHT = 130;

const createStyles = (colors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#1E1B4B',
        },
        slide: {
            width,
            height,
        },
        gradient: {
            flex: 1,
        },
        skipBtn: {
            position: 'absolute',
            top: 56,
            right: spacing.xl,
            zIndex: 10,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
        },
        skipText: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.semibold,
            color: '#FFF',
        },
        contentArea: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 90,
            paddingBottom: BOTTOM_HEIGHT,
            paddingHorizontal: spacing.xxl,
        },
        centerBlock: {
            alignItems: 'center',
            width: '100%',
        },
        iconCircleLg: {
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xxl,
        },
        iconCircleSm: {
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
        },
        title: {
            fontSize: 26,
            fontFamily: fontFamily.bold,
            color: '#FFF',
            textAlign: 'center',
            marginBottom: spacing.sm,
        },
        description: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: spacing.xl,
            maxWidth: 300,
        },
        letsGo: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.semibold,
            color: 'rgba(255,255,255,0.9)',
            marginTop: spacing.xxl,
        },
        previewCard: {
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            backdropFilter: 'blur(10px)',
        },
        previewRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.md,
        },
        previewRowBorder: {
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.15)',
        },
        previewIcon: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        previewLabel: {
            flex: 1,
            fontSize: fontSize.base,
            fontFamily: fontFamily.medium,
            color: '#FFF',
            marginLeft: spacing.md,
        },
        previewAmount: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.bold,
            color: '#FFF',
            marginLeft: spacing.md,
        },
        budgetRow: {
            paddingVertical: spacing.sm,
        },
        budgetHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
        },
        budgetLabelRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        budgetDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            marginRight: spacing.sm,
        },
        budgetLabel: {
            fontSize: fontSize.base,
            fontFamily: fontFamily.medium,
            color: '#FFF',
        },
        budgetPercent: {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.bold,
            color: '#FFF',
        },
        progressBg: {
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 3,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            borderRadius: 3,
        },
        bottom: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: BOTTOM_HEIGHT,
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 44,
            paddingHorizontal: spacing.xl,
        },
        dots: {
            flexDirection: 'row',
            marginBottom: spacing.lg,
        },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.4)',
            marginHorizontal: 4,
        },
        dotActive: {
            width: 24,
            backgroundColor: '#FFF',
        },
        nextBtn: {
            width: '100%',
            borderRadius: 16,
            overflow: 'hidden',
        },
        nextBtnInner: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.lg,
        },
        nextBtnText: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: '#FFF',
        },
    });
