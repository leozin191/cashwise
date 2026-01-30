import { useState } from 'react';
import { expenseService } from '../services/api';

export default function ExpenseForm({ onExpenseCreated }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [suggestedCategory, setSuggestedCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestionLoading, setSuggestionLoading] = useState(false);

    const handleDescriptionChange = async (e) => {
        const value = e.target.value;
        setDescription(value);

        if (value.length >= 3) {
            setSuggestionLoading(true);
            try {
                const result = await expenseService.suggestCategory(value);
                setSuggestedCategory(result.suggestedCategory);
                setCategory(result.suggestedCategory);
            } catch (error) {
                console.error('Erro ao sugerir categoria:', error);
            } finally {
                setSuggestionLoading(false);
            }
        } else {
            setSuggestedCategory('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const expense = {
                description,
                amount: parseFloat(amount),
                currency,
                date,
                category: category || undefined
            };

            await expenseService.create(expense);

            setDescription('');
            setAmount('');
            setCategory('');
            setSuggestedCategory('');
            setDate(new Date().toISOString().split('T')[0]);

            if (onExpenseCreated) onExpenseCreated();
        } catch (error) {
            console.error('Erro ao criar gasto:', error);
            alert('Erro ao criar gasto!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Descrição */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                </label>
                <input
                    type="text"
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="Ex: Café no Starbucks"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />

                {/* Sugestão IA */}
                {suggestionLoading && (
                    <div className="mt-2 text-sm text-gray-500 animate-pulse">
                        🤖 IA pensando...
                    </div>
                )}

                {suggestedCategory && !suggestionLoading && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-fade-in">
                        <p className="text-sm font-medium text-blue-700">
                            💡 IA sugere: <span className="font-bold">{suggestedCategory}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Categoria */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                </label>
                <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Deixe vazio para IA categorizar"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
            </div>

            {/* Valor e Moeda */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Moeda
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white"
                    >
                        <option value="EUR">EUR €</option>
                        <option value="BRL">BRL R$</option>
                        <option value="USD">USD $</option>
                    </select>
                </div>
            </div>

            {/* Data */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data
                </label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
            </div>

            {/* Botão */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Criando...' : 'Criar Gasto'}
            </button>
        </form>
    );
}