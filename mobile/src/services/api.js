import axios from 'axios';

// Pega da variável de ambiente
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/expenses';

export const expenseService = {
    // Buscar todas as despesas
    getAll: async () => {
        try {
            const response = await axios.get(API_URL);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            throw error;
        }
    },

    // Criar despesa
    create: async (expense) => {
        try {
            const response = await axios.post(API_URL, expense);
            return response.data;
        } catch (error) {
            console.error('Erro ao criar despesa:', error);
            throw error;
        }
    },

    // Deletar despesa
    delete: async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
        } catch (error) {
            console.error('Erro ao deletar despesa:', error);
            throw error;
        }
    },

    // Atualizar despesa
    update: async (id, expense) => {
        try {
            const response = await axios.put(`${API_URL}/${id}`, expense);
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
            const response = await axios.get(API_URL.replace('/expenses', '/subscriptions'));
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar subscriptions:', error);
            throw error;
        }
    },

    create: async (subscription) => {
        try {
            const response = await axios.post(API_URL.replace('/expenses', '/subscriptions'), subscription);
            return response.data;
        } catch (error) {
            console.error('Erro ao criar subscription:', error);
            throw error;
        }
    },

    update: async (id, subscription) => {
        try {
            const response = await axios.put(`${API_URL.replace('/expenses', '/subscriptions')}/${id}`, subscription);
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar subscription:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            await axios.delete(`${API_URL.replace('/expenses', '/subscriptions')}/${id}`);
        } catch (error) {
            console.error('Erro ao deletar subscription:', error);
            throw error;
        }
    },

    toggle: async (id) => {
        try {
            const response = await axios.patch(`${API_URL.replace('/expenses', '/subscriptions')}/${id}/toggle`);
            return response.data;
        } catch (error) {
            console.error('Erro ao toggle subscription:', error);
            throw error;
        }
    },

    processNow: async () => {
        try {
            const response = await axios.post(API_URL.replace('/expenses', '/subscriptions') + '/process');
            return response.data;
        } catch (error) {
            console.error('Erro ao processar subscriptions:', error);
            throw error;
        }
    },
};