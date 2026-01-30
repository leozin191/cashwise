import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/expenses';

export const expenseService = {
    // Listar todos os gastos
    getAll: async () => {
        const response = await axios.get(API_URL);
        return response.data;
    },

    // Criar novo gasto
    create: async (expense) => {
        const response = await axios.post(API_URL, expense);
        return response.data;
    },

    // Sugestão de categoria com IA! 🤖
    suggestCategory: async (description) => {
        const response = await axios.get(`${API_URL}/suggest-category`, {
            params: { description }
        });
        return response.data;
    },

    // Deletar gasto
    delete: async (id) => {
        await axios.delete(`${API_URL}/${id}`);
    }
};