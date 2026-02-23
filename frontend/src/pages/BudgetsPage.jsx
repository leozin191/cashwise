import { useState, useEffect, useMemo } from 'react';
import { expenseService, budgetService } from '../services/api';
import { useToast } from '../components/useToast';

const EXPENSE_CATEGORIES = [
    'Food', 'Groceries', 'Delivery', 'Restaurants', 'Shopping',
    'Transport', 'Travel', 'Entertainment', 'Health',
    'Utilities', 'Services', 'Insurance', 'General',
];

const CATEGORY_COLORS = {
    Food: '#F97316', Groceries: '#22C55E', Delivery: '#F59E0B',
    Restaurants: '#EF4444', Shopping: '#F43F5E', Transport: '#3B82F6',
    Travel: '#06B6D4', Entertainment: '#EC4899', Health: '#10B981',
    Utilities: '#14B8A6', Services: '#8B5CF6', Insurance: '#6366F1',
    General: '#6B7280',
};

function getProgressColor(pct) {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-400';
    return 'bg-emerald-500';
}

function getProgressTextColor(pct) {
    if (pct >= 100) return 'text-red-600';
    if (pct >= 80) return 'text-yellow-600';
    return 'text-emerald-600';
}

export default function BudgetsPage() {
    const [expenses, setExpenses] = useState([]);
    // budgetMap: category -> { id, monthlyLimit, currency }
    const [budgetMap, setBudgetMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const currentMonth = new Date().toISOString().slice(0, 7);

    const loadData = () => {
        Promise.all([expenseService.getAll(), budgetService.getAll()])
            .then(([exps, budgets]) => {
                setExpenses(exps);
                const map = {};
                budgets.forEach((b) => {
                    map[b.category] = { id: b.id, monthlyLimit: Number(b.monthlyLimit), currency: b.currency };
                });
                setBudgetMap(map);
            })
            .catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const spentByCategory = useMemo(() => {
        const map = {};
        expenses
            .filter((e) => e.date?.startsWith(currentMonth))
            .forEach((e) => {
                const cat = e.category || 'General';
                map[cat] = (map[cat] || 0) + Number(e.amount);
            });
        return map;
    }, [expenses, currentMonth]);

    const handleSave = async (category) => {
        const limit = parseFloat(editValue);
        if (!limit || limit <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        setSaving(true);
        try {
            const currency = budgetMap[category]?.currency || 'EUR';
            const saved = await budgetService.upsert(category, limit, currency);
            setBudgetMap((prev) => ({
                ...prev,
                [category]: { id: saved.id, monthlyLimit: Number(saved.monthlyLimit), currency: saved.currency },
            }));
            setEditingCategory(null);
            setEditValue('');
            toast.success(`Budget set for ${category}`);
        } catch {
            toast.error('Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category) => {
        const budget = budgetMap[category];
        if (!budget) return;
        try {
            await budgetService.delete(budget.id);
            setBudgetMap((prev) => {
                const next = { ...prev };
                delete next[category];
                return next;
            });
            toast.success('Budget removed');
        } catch {
            toast.error('Failed to remove budget');
        }
    };

    const handleStartEdit = (category) => {
        setEditingCategory(category);
        setEditValue(budgetMap[category]?.monthlyLimit?.toString() || '');
    };

    const fmt = (n, currency) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'EUR' }).format(n || 0);

    if (loading) return <div className="flex justify-center py-20"><p className="text-muted font-medium">Loading...</p></div>;

    const monthLabel = new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted">Set monthly spending limits per category. Budgets are synced across all your devices.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EXPENSE_CATEGORIES.map((cat) => {
                    const spent = spentByCategory[cat] || 0;
                    const budget = budgetMap[cat];
                    const limit = budget?.monthlyLimit;
                    const currency = budget?.currency || 'EUR';
                    const pct = limit ? Math.min((spent / limit) * 100, 100) : 0;
                    const rawPct = limit ? (spent / limit) * 100 : 0;
                    const dotColor = CATEGORY_COLORS[cat] || '#6B7280';
                    const isEditing = editingCategory === cat;

                    return (
                        <div key={cat} className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                    <span className="text-sm font-semibold text-ink">{cat}</span>
                                </div>
                                {limit && !isEditing && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStartEdit(cat)} className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                                        <button onClick={() => handleDelete(cat)} className="text-xs text-error hover:underline bg-transparent border-none cursor-pointer">Remove</button>
                                    </div>
                                )}
                            </div>

                            {limit && !isEditing ? (
                                <>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-muted">Spent: <span className={`font-semibold ${getProgressTextColor(rawPct)}`}>{fmt(spent, currency)}</span></span>
                                        <span className="text-muted">Limit: <span className="font-semibold text-ink">{fmt(limit, currency)}</span></span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${getProgressColor(rawPct)}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className={`text-xs font-semibold ${getProgressTextColor(rawPct)}`}>
                                            {rawPct.toFixed(0)}%
                                            {rawPct >= 100 && ' — Over budget!'}
                                            {rawPct >= 80 && rawPct < 100 && ' — Near limit'}
                                        </span>
                                        <span className="text-xs text-muted">{fmt(Math.max(limit - spent, 0), currency)} left</span>
                                    </div>
                                </>
                            ) : isEditing ? (
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Limit"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="flex-1 px-3 py-1.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave(cat)}
                                    />
                                    <button
                                        onClick={() => handleSave(cat)}
                                        disabled={saving}
                                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold cursor-pointer border-none disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button onClick={() => setEditingCategory(null)} className="px-3 py-1.5 rounded-xl bg-canvas text-ink text-xs font-medium cursor-pointer border border-border">Cancel</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-muted mb-2">Spent this month: <span className="font-semibold text-ink">{fmt(spent, 'EUR')}</span></p>
                                    <button
                                        onClick={() => handleStartEdit(cat)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-dashed border-border text-xs text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer bg-transparent"
                                    >
                                        + Set budget limit
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {Object.keys(budgetMap).length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="text-base font-semibold text-ink mb-3">{monthLabel} Summary</h3>
                    <div className="space-y-2">
                        {EXPENSE_CATEGORIES.filter((c) => budgetMap[c]).map((cat) => {
                            const spent = spentByCategory[cat] || 0;
                            const { monthlyLimit: limit, currency } = budgetMap[cat];
                            const rawPct = (spent / limit) * 100;
                            return (
                                <div key={cat} className="flex items-center justify-between text-sm">
                                    <span className="text-ink font-medium">{cat}</span>
                                    <span className={`font-semibold ${getProgressTextColor(rawPct)}`}>{fmt(spent, currency)} / {fmt(limit, currency)}</span>
                                </div>
                            );
                        })}
                        <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                            <span className="text-ink">Total budgeted</span>
                            <span className="text-ink">
                                {fmt(EXPENSE_CATEGORIES.filter((c) => budgetMap[c]).reduce((s, c) => s + (spentByCategory[c] || 0), 0), 'EUR')}
                                {' / '}
                                {fmt(EXPENSE_CATEGORIES.filter((c) => budgetMap[c]).reduce((s, c) => s + (budgetMap[c]?.monthlyLimit || 0), 0), 'EUR')}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
