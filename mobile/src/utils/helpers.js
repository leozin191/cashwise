// Formata data (Hoje, Ontem, DD/MM) — aceita idioma
export function formatDate(dateString, language = 'pt') {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const labels = {
        pt: { today: 'Hoje', yesterday: 'Ontem', locale: 'pt-BR' },
        en: { today: 'Today', yesterday: 'Yesterday', locale: 'en-US' },
    };
    const l = labels[language] || labels.pt;

    if (date.toDateString() === today.toDateString()) {
        return l.today;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return l.yesterday;
    } else {
        return date.toLocaleDateString(l.locale, {
            day: '2-digit',
            month: '2-digit'
        });
    }
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

// Ordenação de despesas
export function sortByNewest(expenses) {
    return [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function sortByOldest(expenses) {
    return [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function sortByHighest(expenses) {
    return [...expenses].sort((a, b) => b.amount - a.amount);
}

export function sortByLowest(expenses) {
    return [...expenses].sort((a, b) => a.amount - b.amount);
}

// Estatísticas
export function getHighestExpense(expenses) {
    if (expenses.length === 0) return null;
    return expenses.reduce((max, exp) => exp.amount > max.amount ? exp : max);
}

export function getAveragePerDay(expenses, startDate, endDate) {
    if (expenses.length === 0) return 0;

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Se não passar datas, calcula entre a primeira e última despesa
    if (!startDate || !endDate) {
        const dates = expenses.map(exp => new Date(exp.date)).sort((a, b) => a - b);
        startDate = dates[0];
        endDate = dates[dates.length - 1];
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return total / days;
}

export function getTopCategory(expenses) {
    if (expenses.length === 0) return null;

    const grouped = expenses.reduce((acc, exp) => {
        const category = exp.category || 'Other';
        if (!acc[category]) acc[category] = 0;
        acc[category] += exp.amount;
        return acc;
    }, {});

    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);
    const topCategory = sorted[0];

    return {
        name: topCategory[0],
        amount: topCategory[1],
        percentage: ((topCategory[1] / total) * 100).toFixed(0)
    };
}

// Agrupar despesas por mês
export function groupByMonth(expenses) {
    const grouped = {};

    expenses.forEach((exp) => {
        const date = new Date(exp.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!grouped[monthYear]) {
            grouped[monthYear] = 0;
        }
        grouped[monthYear] += exp.amount;
    });

    return grouped;
}

// Pega últimos N meses
export function getLastNMonths(n = 6) {
    const months = [];
    const now = new Date();

    for (let i = n - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push({
            key: monthYear,
            label: date.toLocaleDateString('pt-BR', { month: 'short' }),
            fullDate: date,
        });
    }

    return months;
}