import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGETS_KEY = '@budgets';

export async function getBudgets() {
    try {
        const data = await AsyncStorage.getItem(BUDGETS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error loading budgets:', error);
        return {};
    }
}

export async function saveBudget(category, limit, currency) {
    try {
        const budgets = await getBudgets();
        budgets[category] = { limit, currency };
        await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
        return true;
    } catch (error) {
        console.error('Error saving budget:', error);
        return false;
    }
}

export async function deleteBudget(category) {
    try {
        const budgets = await getBudgets();
        delete budgets[category];
        await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
        return true;
    } catch (error) {
        console.error('Error deleting budget:', error);
        return false;
    }
}

export function calculateProgress(spent, limit) {
    if (limit === 0) return 0;
    return (spent / limit) * 100;
}

export function getAlertLevel(percentage) {
    if (percentage >= 100) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'safe';
}