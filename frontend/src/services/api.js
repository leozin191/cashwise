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
const BUDGETS_URL = `${BASE_URL}/budgets`;

const api = axios.create({ timeout: 15000 });

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (newToken) => {
    refreshSubscribers.forEach((cb) => cb(newToken, null));
    refreshSubscribers = [];
};

const onRefreshFailed = () => {
    refreshSubscribers.forEach((cb) => cb(null, new Error('Token refresh failed')));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

const forceLogout = () => {
    localStorage.removeItem('cashwise_token');
    window.dispatchEvent(new Event('auth:logout'));
};

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('cashwise_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url?.includes('/auth/refresh')) {
                forceLogout();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    addRefreshSubscriber((newToken, err) => {
                        if (err || !newToken) return reject(err || new Error('Unauthorized'));
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const res = await api.post(`${AUTH_URL}/refresh`);
                const { token: newToken } = res.data;

                localStorage.setItem('cashwise_token', newToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                onRefreshed(newToken);

                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch {
                onRefreshFailed();
                forceLogout();
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
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
    deleteAccount: async (password) => (await api.delete(`${AUTH_URL}/account`, { data: { password } })).data,
    forgotPassword: async (email) => api.post(`${AUTH_URL}/forgot-password`, { email }),
    resetPassword: async (token, newPassword) => api.post(`${AUTH_URL}/reset-password`, { token, newPassword }),
    checkUsername: async (username) => (await api.get(`${AUTH_URL}/check-username/${encodeURIComponent(username)}`)).data,
    setUsername: async (username) => (await api.put(`${AUTH_URL}/username`, { username })).data,
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

export const budgetService = {
    getAll: async () => (await api.get(BUDGETS_URL)).data,
    upsert: async (category, monthlyLimit, currency) =>
        (await api.post(BUDGETS_URL, { category, monthlyLimit, currency })).data,
    delete: async (id) => api.delete(`${BUDGETS_URL}/${id}`),
};
