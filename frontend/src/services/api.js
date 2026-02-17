import axios from 'axios';

const normalizeBase = (value) => {
    if (!value) return 'http://localhost:8080/api';
    const trimmed = value.replace(/\/+$/, '');
    if (trimmed.endsWith('/expenses')) return trimmed.replace(/\/expenses$/, '');
    if (trimmed.endsWith('/incomes')) return trimmed.replace(/\/incomes$/, '');
    if (trimmed.endsWith('/subscriptions')) return trimmed.replace(/\/subscriptions$/, '');
    return trimmed;
};

const BASE_URL = normalizeBase(import.meta.env.VITE_API_URL);
const EXPENSES_URL = `${BASE_URL}/expenses`;
const INCOMES_URL = `${BASE_URL}/incomes`;
const SUBSCRIPTIONS_URL = `${BASE_URL}/subscriptions`;
const AUTH_URL = `${BASE_URL}/auth`;

const api = axios.create({ timeout: 15000 });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('cashwise_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('cashwise_token');
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export const apiMeta = { baseUrl: BASE_URL };

export const authService = {
    register: async (data) => (await api.post(`${AUTH_URL}/register`, data)).data,
    login: async (data) => (await api.post(`${AUTH_URL}/login`, data)).data,
    getProfile: async () => (await api.get(`${AUTH_URL}/profile`)).data,
    updateProfile: async (data) => (await api.put(`${AUTH_URL}/profile`, data)).data,
    changePassword: async (data) => (await api.put(`${AUTH_URL}/password`, data)).data,
    refreshToken: async () => (await api.post(`${AUTH_URL}/refresh`)).data,
    deleteAccount: async () => (await api.delete(`${AUTH_URL}/account`)).data,
};

export const expenseService = {
    getAll: async () => (await api.get(EXPENSES_URL)).data,
    create: async (expense) => (await api.post(EXPENSES_URL, expense)).data,
    update: async (id, expense) => (await api.put(`${EXPENSES_URL}/${id}`, expense)).data,
    delete: async (id) => api.delete(`${EXPENSES_URL}/${id}`),
    bulk: async (items) => (await api.post(`${EXPENSES_URL}/bulk`, items)).data,
    suggestCategory: async (description) => {
        const response = await api.get(`${EXPENSES_URL}/suggest-category`, {
            params: { description }
        });
        return response.data;
    }
};

export const incomeService = {
    getAll: async () => (await api.get(INCOMES_URL)).data,
    create: async (income) => (await api.post(INCOMES_URL, income)).data,
    update: async (id, income) => (await api.put(`${INCOMES_URL}/${id}`, income)).data,
    delete: async (id) => api.delete(`${INCOMES_URL}/${id}`),
    bulk: async (items) => (await api.post(`${INCOMES_URL}/bulk`, items)).data
};

export const subscriptionService = {
    getAll: async () => (await api.get(SUBSCRIPTIONS_URL)).data,
    getActive: async () => (await api.get(`${SUBSCRIPTIONS_URL}/active`)).data,
    create: async (subscription) => (await api.post(SUBSCRIPTIONS_URL, subscription)).data,
    update: async (id, subscription) => (await api.put(`${SUBSCRIPTIONS_URL}/${id}`, subscription)).data,
    delete: async (id) => api.delete(`${SUBSCRIPTIONS_URL}/${id}`),
    toggle: async (id) => (await api.patch(`${SUBSCRIPTIONS_URL}/${id}/toggle`)).data,
    bulk: async (items) => (await api.post(`${SUBSCRIPTIONS_URL}/bulk`, items)).data,
    processNow: async () => (await api.post(`${SUBSCRIPTIONS_URL}/process`)).data
};
