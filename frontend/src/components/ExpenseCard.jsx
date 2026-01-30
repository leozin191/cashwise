export default function ExpenseCard({ expense, onDelete }) {
    const categoryEmojis = {
        'Alimentação': '🍔',
        'Transporte': '🚗',
        'Moradia': '🏠',
        'Lazer': '🎮',
        'Saúde': '💊',
        'Educação': '📚',
        'Compras': '🛍️',
        'Outros': '💰'
    };

    const categoryColors = {
        'Alimentação': 'bg-red-100 text-red-600',
        'Transporte': 'bg-blue-100 text-blue-600',
        'Moradia': 'bg-yellow-100 text-yellow-600',
        'Lazer': 'bg-purple-100 text-purple-600',
        'Saúde': 'bg-green-100 text-green-600',
        'Educação': 'bg-indigo-100 text-indigo-600',
        'Compras': 'bg-pink-100 text-pink-600',
        'Outros': 'bg-gray-100 text-gray-600'
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">
              {categoryEmojis[expense.category] || '💰'}
            </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            categoryColors[expense.category] || 'bg-gray-100 text-gray-600'
                        }`}>
              {expense.category}
            </span>
                    </div>

                    <p className="text-gray-800 font-medium mb-1">
                        {expense.description}
                    </p>

                    <p className="text-gray-500 text-sm">
                        {new Date(expense.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">
                        {expense.currency} {expense.amount.toFixed(2)}
                    </p>

                    <button
                        onClick={() => onDelete(expense.id)}
                        className="mt-2 text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                        Deletar
                    </button>
                </div>
            </div>
        </div>
    );
}