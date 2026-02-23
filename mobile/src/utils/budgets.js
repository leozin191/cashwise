import { budgetService } from '../services/api';

/**
 * Fetch all budgets for the current household and return them as a
 * category-keyed map: { [category]: { id, limit, currency } }
 */
export async function getBudgets() {
    try {
        const list = await budgetService.getAll();
        return list.reduce((acc, b) => {
            acc[b.category] = { id: b.id, limit: parseFloat(b.monthlyLimit), currency: b.currency };
            return acc;
        }, {});
    } catch (error) {
        console.error('Error loading budgets:', error);
        return {};
    }
}

/**
 * Create or update a budget.
 * Pass existingId to update an existing one, omit to create new.
 */
export async function saveBudget(category, limit, currency, existingId = null) {
    try {
        if (existingId) {
            await budgetService.update(existingId, category, limit, currency);
        } else {
            await budgetService.create(category, limit, currency);
        }
        return true;
    } catch (error) {
        console.error('Error saving budget:', error);
        return false;
    }
}

/**
 * Delete a budget by its server-side id.
 */
export async function deleteBudget(id) {
    try {
        await budgetService.delete(id);
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
