import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, TouchableOpacity } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SplashScreen from './src/components/SplashScreen';
import OnboardingScreen from './src/components/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { SnackbarProvider } from './src/contexts/SnackbarContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { setOnUnauthorized } from './src/services/api';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import MonthlyReportScreen from './src/screens/MonthlyReportScreen';
import DataSettingsScreen from './src/screens/DataSettingsScreen';
import ReportSettingsScreen from './src/screens/ReportSettingsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import { fontFamily } from './src/constants/theme';
import IncomesScreen from './src/screens/IncomesScreen';
import AIChatScreen from './src/screens/AIChatScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import ChooseUsernameScreen from './src/screens/ChooseUsernameScreen';
import QuickAddFab from './src/components/QuickAddFab';
import ApiEventsBridge from './src/components/ApiEventsBridge';
import ErrorBoundary from './src/components/ErrorBoundary';

const navigationRef = createNavigationContainerRef();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const CORE_TAB_ROUTES = ['Home', 'Budgets', 'Incomes', 'Subscriptions'];

const TAB_ICONS = {
    Home: { focused: 'home', unfocused: 'home-outline' },
    Budgets: { focused: 'flag', unfocused: 'flag-outline' },
    Incomes: { focused: 'cash', unfocused: 'cash-outline' },
    Subscriptions: { focused: 'repeat', unfocused: 'repeat-outline' },
};

function AnimatedTabButton({ children, onPress, onLongPress, style }) {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.82, duration: 90, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, damping: 10, stiffness: 180, mass: 0.5, useNativeDriver: true }),
        ]).start();
        onPress?.();
    };
    return (
        <Animated.View style={[style, { transform: [{ scale }] }]}>
            <TouchableOpacity onPress={handlePress} onLongPress={onLongPress} activeOpacity={1} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}

function MainTabs() {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <Tab.Navigator
            id="main-tabs"
            screenOptions={({ route }) => ({
                animation: 'shift',
                lazy: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarActiveBackgroundColor: colors.primaryBg,
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarButton: (props) => <AnimatedTabButton {...props} />,
                sceneStyle: {
                    backgroundColor: colors.background,
                },
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    paddingBottom: 8,
                    paddingTop: 6,
                    height: 66,
                },
                tabBarItemStyle: {
                    borderRadius: 14,
                    marginHorizontal: 4,
                },
                tabBarLabelStyle: {
                    fontFamily: fontFamily.medium,
                    fontSize: 11,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name];
                    if (!icons) return null;
                    const iconName = focused ? icons.focused : icons.unfocused;
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: t('home'), tabBarAccessibilityLabel: t('home') }}
            />
            <Tab.Screen
                name="Budgets"
                component={BudgetsScreen}
                options={{ tabBarLabel: t('budgetGoals'), tabBarAccessibilityLabel: t('budgetGoals') }}
            />
            <Tab.Screen
                name="Incomes"
                component={IncomesScreen}
                options={{ tabBarLabel: t('income'), tabBarAccessibilityLabel: t('income') }}
            />
            <Tab.Screen
                name="Subscriptions"
                component={SubscriptionsScreen}
                options={{ tabBarLabel: t('subscriptions'), tabBarAccessibilityLabel: t('subscriptions') }}
            />
        </Tab.Navigator>
    );
}

function AppNavigator() {
    const { token, user, isLoading, logout } = useAuth();
    const { colors } = useTheme();
    const [currentRouteName, setCurrentRouteName] = useState(null);

    const handleNavigationStateChange = useCallback(() => {
        const route = navigationRef.getCurrentRoute();
        setCurrentRouteName(route?.name || null);
    }, []);

    useEffect(() => {
        setOnUnauthorized(() => {
            logout();
        });
    }, [logout]);

    const navTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: colors.background,
            card: colors.surface,
            border: colors.border,
        },
    };

    if (isLoading) {
        return null;
    }

    // Logged in but no username yet → force username setup before entering app
    if (token && !user?.username) {
        return <ChooseUsernameScreen />;
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navTheme}
            onReady={handleNavigationStateChange}
            onStateChange={handleNavigationStateChange}
        >
            {token ? (
                <>
                    <Stack.Navigator
                        id="main-stack"
                        screenOptions={{
                            headerShown: false,
                            animation: 'slide_from_right',
                            animationDuration: 220,
                        }}
                    >
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} />
                        <Stack.Screen name="DataSettings" component={DataSettingsScreen} />
                        <Stack.Screen name="ReportSettings" component={ReportSettingsScreen} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                        <Stack.Screen name="AIChat" component={AIChatScreen} />
                        <Stack.Screen name="Family" component={FamilyScreen} options={{ presentation: 'modal' }} />
                    </Stack.Navigator>
                    {CORE_TAB_ROUTES.includes(currentRouteName) ? (
                        <QuickAddFab navigationRef={navigationRef} />
                    ) : null}
                    <ApiEventsBridge />
                </>
            ) : (
                <Stack.Navigator
                    id="auth-stack"
                    screenOptions={{
                        headerShown: false,
                        animation: 'fade_from_bottom',
                        animationDuration: 250,
                    }}
                >
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
}

function AppShell() {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <ErrorBoundary colors={colors} t={t}>
            <AppNavigator />
        </ErrorBoundary>
    );
}

export default function App() {
    const [showSplash, setShowSplash] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(null);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    useEffect(() => {
        AsyncStorage.getItem(OnboardingScreen.ONBOARDING_KEY).then((value) => {
            setShowOnboarding(value !== 'true');
        });
    }, []);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('replayTutorial', () => {
            setShowOnboarding(true);
        });
        return () => sub.remove();
    }, []);

    if (showSplash || !fontsLoaded) {
        return <SplashScreen onFinish={() => setShowSplash(false)} fontsReady={fontsLoaded} />;
    }

    if (showOnboarding) {
        return (
            <ThemeProvider>
                <LanguageProvider>
                    <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
                </LanguageProvider>
            </ThemeProvider>
        );
    }

    return (
        <AuthProvider>
            <ThemeProvider>
                <LanguageProvider>
                    <CurrencyProvider>
                        <SnackbarProvider>
                            <AppShell />
                        </SnackbarProvider>
                    </CurrencyProvider>
                </LanguageProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
