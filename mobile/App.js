import React, { useState } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SplashScreen from './src/components/SplashScreen';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
    const { colors } = useTheme();
    const { t } = useLanguage();

    return (
        <Tab.Navigator
            id="main-tabs"
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    paddingBottom: 5,
                    height: 60,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: t('home'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size }}>🏠</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Budgets"
                component={BudgetsScreen}
                options={{
                    tabBarLabel: t('budgetGoals'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size }}>🎯</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Subscriptions"
                component={SubscriptionsScreen}
                options={{
                    tabBarLabel: t('subscriptions'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size -4 }}>🔄</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: t('settings'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size }}>⚙️</Text>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [showSplash, setShowSplash] = useState(true);

    if (showSplash) {
        return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    return (
        <ThemeProvider>
            <LanguageProvider>
                <CurrencyProvider>
                    <NavigationContainer>
                        <MainTabs />
                    </NavigationContainer>
                </CurrencyProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}