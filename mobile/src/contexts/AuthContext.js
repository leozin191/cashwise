import { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, setAuthToken, setOnTokenRefreshed, clearAllCaches } from '../services/api';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    useEffect(() => {
        setOnTokenRefreshed(async (newToken, data) => {
            setToken(newToken);
            if (data?.name && data?.email) {
                const userData = { name: data.name, email: data.email, username: data.username || null };
                setUser(userData);
                await storeCredentials(newToken, userData);
            } else {
                await SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken);
            }
        });

        return () => setOnTokenRefreshed(null);
    }, []);

    const loadStoredAuth = async () => {
        try {
            const [storedToken, storedUser] = await Promise.all([
                SecureStore.getItemAsync(AUTH_TOKEN_KEY),
                SecureStore.getItemAsync(AUTH_USER_KEY),
            ]);

            if (storedToken && storedUser) {
                let userData;
                try {
                    userData = JSON.parse(storedUser);
                } catch {
                    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
                }
                if (userData?.name && userData?.email) {
                    setAuthToken(storedToken);
                    setToken(storedToken);
                    setUser({ name: userData.name, email: userData.email, username: userData.username || null });
                } else {
                    await clearCredentials();
                }
            }
        } catch (error) {
            console.error('Error loading auth:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const storeCredentials = async (newToken, userData) => {
        await Promise.all([
            SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken),
            SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(userData)),
        ]);
    };

    const clearCredentials = async () => {
        await Promise.all([
            SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
            SecureStore.deleteItemAsync(AUTH_USER_KEY),
        ]);
    };

    const login = async (email, password) => {
        const response = await authService.login(email, password);
        const { token: newToken, name, email: userEmail, username } = response;
        const userData = { name, email: userEmail, username: username || null };

        setAuthToken(newToken);
        setToken(newToken);
        setUser(userData);

        await storeCredentials(newToken, userData);

        return response;
    };

    const register = async (name, email, password, username) => {
        const response = await authService.register(name, email, password, username);
        const { token: newToken, name: userName, email: userEmail, username: userUsername } = response;
        const userData = { name: userName, email: userEmail, username: userUsername || null };

        setAuthToken(newToken);
        setToken(newToken);
        setUser(userData);

        await storeCredentials(newToken, userData);

        return response;
    };

    const setUsername = async (username) => {
        const response = await authService.setUsername(username);
        const { token: newToken, name, email: userEmail, username: newUsername } = response;
        const userData = { name, email: userEmail, username: newUsername };
        setAuthToken(newToken);
        setToken(newToken);
        setUser(userData);
        await storeCredentials(newToken, userData);
        return response;
    };

    const updateProfile = async (name) => {
        const profile = await authService.updateProfile(name);
        const updatedUser = { ...user, name: profile.name };
        setUser(updatedUser);
        await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(updatedUser));
        return profile;
    };

    const deleteAccount = async (password) => {
        await authService.deleteAccount(password);
        await logout();
    };

    const logout = async () => {
        setAuthToken(null);
        setToken(null);
        setUser(null);

        await Promise.all([
            clearCredentials(),
            AsyncStorage.removeItem('@budgets'),
            AsyncStorage.removeItem('@subscriptions_last_processed'),
            AsyncStorage.removeItem('@user_email'),
            AsyncStorage.removeItem('@api_cache:household'),
            clearAllCaches(),
        ]);
    };

    return (
        <AuthContext.Provider value={{ token, user, isLoading, login, register, logout, updateProfile, deleteAccount, setUsername }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
