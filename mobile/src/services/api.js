import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
const EXPENSES_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/expenses` : BASE_URL;
const INCOMES_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/incomes` : BASE_URL.replace('/expenses', '/incomes');
const SUBSCRIPTIONS_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/subscriptions` : BASE_URL.replace('/expenses', '/subscriptions');

const AUTH_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/auth` : BASE_URL.replace('/expenses', '/auth');

const api = axios.create({ timeout: 15000 });
const CACHE_PREFIX = '@api_cache:';
const CACHE_TTL_MS = 1000 * 60 * 10;

let handlers = { onError: null, onOffline: null };
let onUnauthorizedCallback = null;

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export const setOnUnauthorized = (callback) => {
    onUnauthorizedCallback = callback;
};

let isRefreshing = false;
let refreshSubscribers = [];
let onTokenRefreshed = null;

export const setOnTokenRefreshed = (callback) => {
    onTokenRefreshed = callback;
};

const onRefreshed = (newToken) => {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error?.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url?.includes('/auth/refresh')) {
                if (onUnauthorizedCallback) onUnauthorizedCallback();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newToken) => {
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await api.post(`${AUTH_URL}/refresh`);
                const { token: newToken } = response.data;

                setAuthToken(newToken);
                if (onTokenRefreshed) onTokenRefreshed(newToken, response.data);
                onRefreshed(newToken);

                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                if (onUnauthorizedCallback) onUnauthorizedCallback();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        const response = await axios.post(`${AUTH_URL}/login`, { email, password }, { timeout: 15000 });
        return response.data;
    },

    register: async (name, email, password) => {
        const response = await axios.post(`${AUTH_URL}/register`, { name, email, password }, { timeout: 15000 });
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get(`${AUTH_URL}/profile`);
        return response.data;
    },

    updateProfile: async (name) => {
        const response = await api.put(`${AUTH_URL}/profile`, { name });
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        await api.put(`${AUTH_URL}/password`, { currentPassword, newPassword });
    },

    deleteAccount: async () => {
        await api.delete(`${AUTH_URL}/account`);
    },
};

export const clearAllCaches = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
    } catch (error) {}
};

export const setApiHandlers = ({ onError, onOffline } = {}) => {
    handlers = { ...handlers, onError, onOffline };
};

const notifyError = (messageKey, error) => {
    if (handlers.onError) handlers.onError(messageKey, error);
};

const notifyOffline = (messageKey) => {
    if (handlers.onOffline) handlers.onOffline(messageKey);
};

const cacheKey = (key) => `${CACHE_PREFIX}${key}`;

const readCache = async (key) => {
    try {
        const raw = await AsyncStorage.getItem(cacheKey(key));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
};

const writeCache = async (key, data) => {
    try {
        await AsyncStorage.setItem(cacheKey(key), JSON.stringify({ timestamp: Date.now(), data }));
    } catch (error) {}
};

const clearCache = async (key) => {
    try {
        await AsyncStorage.removeItem(cacheKey(key));
    } catch (error) {}
};

const isNetworkError = (error) => !error?.response;

const isOnline = async () => {
    try {
        const state = await NetInfo.fetch();
        return Boolean(state.isConnected);
    } catch (error) {
        return true;
    }
};

const isCacheFresh = (entry) => {
    if (!entry?.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

const requestWithRetry = async (config, retries = 1) => {
    try {
        return await api.request(config);
    } catch (error) {
        if (retries > 0 && isNetworkError(error)) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return requestWithRetry(config, retries - 1);
        }
        throw error;
    }
};

const getAllWithCache = async ({ url, cacheKeyName }) => {
    const cached = await readCache(cacheKeyName);
    const online = await isOnline();

    if (!online && cached?.data) {
        notifyOffline('usingCachedData');
        return cached.data;
    }

    try {
        const response = await requestWithRetry({ method: 'GET', url });
        await writeCache(cacheKeyName, response.data);
        return response.data;
    } catch (error) {
        if (cached?.data) {
            notifyOffline('usingCachedData');
            return cached.data;
        }
        notifyError('networkError', error);
        throw error;
    }
};

export const expenseService = {
    getAll: async () => getAllWithCache({ url: EXPENSES_URL, cacheKeyName: 'expenses' }),

    create: async (expense) => {
        try {
            const response = await requestWithRetry({ method: 'POST', url: EXPENSES_URL, data: expense });
            await clearCache('expenses');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            await requestWithRetry({ method: 'DELETE', url: `${EXPENSES_URL}/${id}` });
            await clearCache('expenses');
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    update: async (id, expense) => {
        try {
            const response = await requestWithRetry({ method: 'PUT', url: `${EXPENSES_URL}/${id}`, data: expense });
            await clearCache('expenses');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },
};

export const incomeService = {
    getAll: async () => getAllWithCache({ url: INCOMES_URL, cacheKeyName: 'incomes' }),

    create: async (income) => {
        try {
            const response = await requestWithRetry({ method: 'POST', url: INCOMES_URL, data: income });
            await clearCache('incomes');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    update: async (id, income) => {
        try {
            const response = await requestWithRetry({ method: 'PUT', url: `${INCOMES_URL}/${id}`, data: income });
            await clearCache('incomes');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            await requestWithRetry({ method: 'DELETE', url: `${INCOMES_URL}/${id}` });
            await clearCache('incomes');
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },
};

export const subscriptionService = {
    getAll: async () => getAllWithCache({ url: SUBSCRIPTIONS_URL, cacheKeyName: 'subscriptions' }),

    create: async (subscription) => {
        try {
            const response = await requestWithRetry({ method: 'POST', url: SUBSCRIPTIONS_URL, data: subscription });
            await clearCache('subscriptions');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    update: async (id, subscription) => {
        try {
            const response = await requestWithRetry({ method: 'PUT', url: `${SUBSCRIPTIONS_URL}/${id}`, data: subscription });
            await clearCache('subscriptions');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            await requestWithRetry({ method: 'DELETE', url: `${SUBSCRIPTIONS_URL}/${id}` });
            await clearCache('subscriptions');
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    toggle: async (id) => {
        try {
            const response = await requestWithRetry({ method: 'PATCH', url: `${SUBSCRIPTIONS_URL}/${id}/toggle` });
            await clearCache('subscriptions');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },

    processNow: async () => {
        try {
            const response = await requestWithRetry({ method: 'POST', url: `${SUBSCRIPTIONS_URL}/process` });
            await clearCache('subscriptions');
            await clearCache('expenses');
            return response.data;
        } catch (error) {
            notifyError('networkError', error);
            throw error;
        }
    },
};
