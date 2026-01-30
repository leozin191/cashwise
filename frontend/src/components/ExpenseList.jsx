import { useState, useEffect } from 'react';
import { expenseService } from '../services/api';

export default function ExpenseList({ refresh }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Carrega gastos quando componente monta ou refresh muda
    useEffect(() => {
        loadExpenses();
    }, [refresh]);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await expenseService.getAll();
            setExpenses(data);
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
                loadExpenses(); // Recarrega lista
            } catch (error) {
                console.error('Erro ao deletar:', error);
                alert('Erro ao deletar gasto!');
            }
        }
    };

    if (loading) {
        return <div>Carregando...</div>;
    }

    return (
        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
            <h2>Meus Gastos ({expenses.length})</h2>

            {expenses.length === 0 ? (
                <p>Nenhum gasto cadastrado ainda.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Data</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Descrição</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Categoria</th>
                        <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Valor</th>
                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Ações</th>
                    </tr>
                    </thead>
                    <tbody>
                    {expenses.map((expense) => (
                        <tr key={expense.id}>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                {new Date(expense.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                {expense.description}
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  <span style={{
                      padding: '4px 8px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '4px'
                  }}>
                    {expense.category}
                  </span>
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                                {expense.currency} {expense.amount.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                <button
                                    onClick={() => handleDelete(expense.id)}
                                    style={{
                                        padding: '5px 10px',
                                        backgroundColor: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    Deletar
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}>
                Total: EUR {expenses
                .filter(e => e.currency === 'EUR')
                .reduce((sum, e) => sum + e.amount, 0)
                .toFixed(2)}
            </div>
        </div>
    );
}