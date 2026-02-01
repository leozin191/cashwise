import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import { LanguageProvider } from './src/contexts/LanguageContext';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <LanguageProvider>
            <NavigationContainer>
                <Tab.Navigator
                    screenOptions={{
                        tabBarActiveTintColor: '#6366F1',
                        tabBarInactiveTintColor: 'gray',
                        headerShown: false,
                        tabBarStyle: {
                            paddingBottom: 5,
                            height: 60,
                        },
                    }}
                >
                    <Tab.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ tabBarLabel: 'Início' }}
                    />
                </Tab.Navigator>
            </NavigationContainer>
        </LanguageProvider>
    );
}