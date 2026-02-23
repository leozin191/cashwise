const BUDGETS_KEY = 'cashwise_budgets';

export function getBudgets() {
    try {
        const data = localStorage.getItem(BUDGETS_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

export function saveBudget(category, limit) {
    const budgets = getBudgets();
    budgets[category] = { limit: Number(limit) };
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function deleteBudget(category) {
    const budgets = getBudgets();
    delete budgets[category];
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function calculateProgress(spent, limit) {
    if (!limit || limit === 0) return 0;
    return (spent / limit) * 100;
}

export function getAlertLevel(percentage) {
    if (percentage >= 100) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'safe';
}
