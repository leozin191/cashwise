import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { expenseService } from '../services/api';
import ExpenseCard from './ExpenseCard';
import FloatingButton from './FloatingButton';
import ExpenseForm from './ExpenseForm';

const COLORS = {
    'Alimentação': '#EF4444',
    'Transporte': '#3B82F6',
    'Moradia': '#F59E0B',
    'Lazer': '#8B5CF6',
    'Saúde': '#10B981',
    'Educação': '#6366F1',
    'Compras': '#EC4899',
    'Outros': '#6B7280'
};

export default function Dashboard() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [total, setTotal] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await expenseService.getAll();
            setExpenses(data);

            const totalAmount = data.reduce((sum, exp) =>
                exp.currency === 'EUR' ? sum + exp.amount : sum, 0
            );
            setTotal(totalAmount);

            const grouped = data.reduce((acc, exp) => {
                if (exp.currency === 'EUR') {
                    const category = exp.category || 'Outros';
                    if (!acc[category]) acc[category] = 0;
                    acc[category] += exp.amount;
                }
                return acc;
            }, {});

            const chartDataArray = Object.entries(grouped).map(([name, value]) => ({
                name,
                value: parseFloat(value.toFixed(2))
            }));

            setChartData(chartDataArray);
        } catch (error) {
            console.error('Erro ao carregar gastos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar?')) {
            try {
                await expenseService.delete(id);
                loadExpenses();
            } catch (error) {
                console.error('Erro ao deletar:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600 text-xl font-semibold animate-pulse">
                    Carregando...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 bg-gray-50">
            {/* Header - Simples e limpo */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-md mx-auto px-4 sm:px-6 py-4">
                    <p className="text-gray-500 text-sm font-medium text-center">
                        Total Gasto
                    </p>
                    <p className="text-4xl sm:text-5xl font-bold text-gray-900 text-center mt-1">
                        €{total.toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs text-center mt-1">
                        {expenses.length} {expenses.length === 1 ? 'transação' : 'transações'}
                    </p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 sm:px-6">
                {/* Gráfico */}
                {chartData.length > 0 && (
                    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 text-center">
                            📊 Gastos por Categoria
                        </h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    onClick={(data) => {
                                        // Toggle: se clicar na mesma categoria, desmarca
                                        if (selectedCategory === data.name) {
                                            setSelectedCategory(null);
                                        } else {
                                            setSelectedCategory(data.name);
                                        }
                                    }}
                                    cursor="pointer"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[entry.name] || COLORS['Outros']}
                                            opacity={selectedCategory === null || selectedCategory === entry.name ? 1 : 0.3}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `€${value.toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        padding: '12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {!selectedCategory && expenses.length > 0 && (
                            <p className="text-center text-sm text-gray-500 mt-4">
                                💡 Clique em uma categoria para ver os detalhes
                            </p>
                        )}
                    </div>
                )}

                {/* Lista de Gastos - Só aparece quando seleciona categoria */}
                {selectedCategory && (
                    <div className="mt-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-gray-700 text-base sm:text-lg font-semibold">
                                {selectedCategory}
                            </h2>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Fechar
                            </button>
                        </div>

                        {expenses.filter(e => e.category === selectedCategory).length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                                <p className="text-gray-500">Nenhum gasto nesta categoria</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {expenses
                                    .filter(e => e.category === selectedCategory)
                                    .slice()
                                    .reverse()
                                    .map((expense) => (
                                        <ExpenseCard
                                            key={expense.id}
                                            expense={expense}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Mensagem quando não tem gastos */}
                {expenses.length === 0 && (
                    <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center">
                        <p className="text-4xl sm:text-5xl mb-4">📭</p>
                        <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                            Nenhum gasto ainda
                        </p>
                        <p className="text-sm text-gray-500">
                            Clique no botão + para adicionar seu primeiro gasto
                        </p>
                    </div>
                )}
            </div>

            {/* Botão Flutuante */}
            <FloatingButton onClick={() => setShowForm(true)} />

            {/* Modal do Formulário */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
                        <div className="sticky top-0 bg-white p-4 sm:p-6 border-b flex justify-between items-center rounded-t-3xl z-10">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                                Novo Gasto
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-gray-600 text-3xl font-light transition-colors w-10 h-10 flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-4 sm:p-6">
                            <ExpenseForm
                                onExpenseCreated={() => {
                                    loadExpenses();
                                    setShowForm(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}