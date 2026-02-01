// Formata data (Hoje, Ontem, DD/MM)
export function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    } else {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
        });
    }
}

// Formata valor monetário
export function formatCurrency(value) {
    return `€${value.toFixed(2)}`;
}

// Calcula percentagem
export function calculatePercentage(value, total) {
    return total > 0 ? ((value / total) * 100).toFixed(0) : 0;
}

// Filtros de data
export function filterByThisMonth(expenses) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return (
            expDate.getMonth() === currentMonth &&
            expDate.getFullYear() === currentYear
        );
    });
}

export function filterByLast30Days(expenses) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= thirtyDaysAgo && expDate <= now;
    });
}

export function filterByAll(expenses) {
    return expenses; // Retorna tudo
}