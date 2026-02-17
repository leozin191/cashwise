import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Easing } from 'react-native';
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

function MainTabs() {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <Tab.Navigator
            id="main-tabs"
            screenOptions={({ route }) => ({
                animation: 'fade',
                transitionSpec: {
                    animation: 'timing',
                    config: {
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                    },
                },
                lazy: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarActiveBackgroundColor: colors.primaryBg,
                headerShown: false,
                tabBarHideOnKeyboard: true,
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
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: t('settings'),
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
            <Tab.Screen
                name="MonthlyReport"
                component={MonthlyReportScreen}
                options={{
                    tabBarLabel: t('monthlyReport'),
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
            <Tab.Screen
                name="DataSettings"
                component={DataSettingsScreen}
                options={{
                    tabBarLabel: t('data'),
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
            <Tab.Screen
                name="ReportSettings"
                component={ReportSettingsScreen}
                options={{
                    tabBarLabel: t('report'),
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
            <Tab.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{
                    tabBarLabel: t('editProfile'),
                    tabBarButton: () => null,
                    tabBarItemStyle: { display: 'none' },
                }}
            />
        </Tab.Navigator>
    );
}

function AppNavigator() {
    const { token, isLoading, logout } = useAuth();
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

    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navTheme}
            onReady={handleNavigationStateChange}
            onStateChange={handleNavigationStateChange}
        >
            {token ? (
                <>
                    <MainTabs />
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
