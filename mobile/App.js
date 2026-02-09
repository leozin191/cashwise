import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SplashScreen from './src/components/SplashScreen';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { SnackbarProvider } from './src/contexts/SnackbarContext';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import { fontFamily } from './src/constants/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
    Home: { focused: 'home', unfocused: 'home-outline' },
    Budgets: { focused: 'flag', unfocused: 'flag-outline' },
    Subscriptions: { focused: 'repeat', unfocused: 'repeat-outline' },
    Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

function MainTabs() {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <Tab.Navigator
            id="main-tabs"
            screenOptions={({ route }) => ({
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    paddingBottom: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontFamily: fontFamily.medium,
                    fontSize: 11,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name];
                    const iconName = focused ? icons.focused : icons.unfocused;
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: t('home') }}
            />
            <Tab.Screen
                name="Budgets"
                component={BudgetsScreen}
                options={{ tabBarLabel: t('budgetGoals') }}
            />
            <Tab.Screen
                name="Subscriptions"
                component={SubscriptionsScreen}
                options={{ tabBarLabel: t('subscriptions') }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarLabel: t('settings') }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [showSplash, setShowSplash] = useState(true);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    if (showSplash || !fontsLoaded) {
        return <SplashScreen onFinish={() => setShowSplash(false)} fontsReady={fontsLoaded} />;
    }

    return (
        <ThemeProvider>
            <LanguageProvider>
                <CurrencyProvider>
                    <SnackbarProvider>
                        <NavigationContainer>
                            <MainTabs />
                        </NavigationContainer>
                    </SnackbarProvider>
                </CurrencyProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
