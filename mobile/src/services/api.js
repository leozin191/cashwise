import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
const EXPENSES_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/expenses` : BASE_URL;
const SUBSCRIPTIONS_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/subscriptions` : BASE_URL.replace('/expenses', '/subscriptions');

const api = axios.create({ timeout: 15000 });

export const expenseService = {
    getAll: async () => {
        try {
            const response = await api.get(EXPENSES_URL);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            throw error;
        }
    },

    create: async (expense) => {
        try {
            const response = await api.post(EXPENSES_URL, expense);
            return response.data;
        } catch (error) {
            console.error('Erro ao criar despesa:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            await api.delete(`${EXPENSES_URL}/${id}`);
        } catch (error) {
            console.error('Erro ao deletar despesa:', error);
            throw error;
        }
    },

    update: async (id, expense) => {
        try {
            const response = await api.put(`${EXPENSES_URL}/${id}`, expense);
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar despesa:', error);
            throw error;
        }
    },
};

export const subscriptionService = {
    getAll: async () => {
        try {
            const response = await api.get(SUBSCRIPTIONS_URL);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar subscriptions:', error);
            throw error;
        }
    },

    create: async (subscription) => {
        try {
            const response = await api.post(SUBSCRIPTIONS_URL, subscription);
            return response.data;
        } catch (error) {
            console.error('Erro ao criar subscription:', error);
            throw error;
        }
    },

    update: async (id, subscription) => {
        try {
            const response = await api.put(`${SUBSCRIPTIONS_URL}/${id}`, subscription);
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar subscription:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            await api.delete(`${SUBSCRIPTIONS_URL}/${id}`);
        } catch (error) {
            console.error('Erro ao deletar subscription:', error);
            throw error;
        }
    },

    toggle: async (id) => {
        try {
            const response = await api.patch(`${SUBSCRIPTIONS_URL}/${id}/toggle`);
            return response.data;
        } catch (error) {
            console.error('Erro ao toggle subscription:', error);
            throw error;
        }
    },

    processNow: async () => {
        try {
            const response = await api.post(`${SUBSCRIPTIONS_URL}/process`);
            return response.data;
        } catch (error) {
            console.error('Erro ao processar subscriptions:', error);
            throw error;
        }
    },
};
