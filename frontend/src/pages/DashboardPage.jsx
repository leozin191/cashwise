import { useState, useEffect, useMemo } from 'react';
import { expenseService, incomeService, subscriptionService } from '../services/api';
import { useToast } from '../components/Toast';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CATEGORY_COLORS = {
    FOOD: '#F97316', TRANSPORT: '#3B82F6', HOUSING: '#8B5CF6',
    ENTERTAINMENT: '#EC4899', HEALTH: '#10B981', SHOPPING: '#F43F5E',
    EDUCATION: '#6366F1', UTILITIES: '#14B8A6', OTHER: '#6B7280',
};

export default function DashboardPage() {
    const [expenses, setExpenses] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        Promise.all([
            expenseService.getAll(),
            incomeService.getAll(),
            subscriptionService.getAll(),
        ])
            .then(([exp, inc, sub]) => {
                setExpenses(exp);
                setIncomes(inc);
                setSubscriptions(sub);
            })
            .catch(() => toast.error('Failed to load dashboard data'))
            .finally(() => setLoading(false));
    }, []);

    const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
    const totalIncomes = useMemo(() => incomes.reduce((s, i) => s + Number(i.amount), 0), [incomes]);
    const activeSubs = useMemo(() => subscriptions.filter((s) => s.active).length, [subscriptions]);

    const monthlyData = useMemo(() => {
        const map = {};
        expenses.forEach((e) => {
            const m = e.date?.slice(0, 7);
            if (m) map[m] = { ...map[m], month: m, expenses: (map[m]?.expenses || 0) + Number(e.amount) };
        });
        incomes.forEach((i) => {
            const m = i.date?.slice(0, 7);
            if (m) map[m] = { ...map[m], month: m, incomes: (map[m]?.incomes || 0) + Number(i.amount) };
        });
        return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
    }, [expenses, incomes]);

    const categoryData = useMemo(() => {
        const map = {};
        expenses.forEach((e) => {
            const cat = e.category || 'OTHER';
            map[cat] = (map[cat] || 0) + Number(e.amount);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

    const recentExpenses = useMemo(() =>
        [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
        [expenses]
    );

    if (loading) {
        return <div className="flex items-center justify-center py-20"><p className="text-muted font-medium">Loading dashboard...</p></div>;
    }

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Total Expenses" value={fmt(totalExpenses)} subtitle={`${expenses.length} transactions`} color="text-error" icon="$" />
                <StatCard label="Total Income" value={fmt(totalIncomes)} subtitle={`${incomes.length} entries`} color="text-success" icon="+" />
                <StatCard label="Net Balance" value={fmt(totalIncomes - totalExpenses)} color={totalIncomes - totalExpenses >= 0 ? 'text-success' : 'text-error'} icon="=" />
                <StatCard label="Subscriptions" value={activeSubs} subtitle={`${subscriptions.length} total`} color="text-primary" icon="R" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend chart */}
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="text-base font-semibold text-ink mb-4">Monthly Trend</h3>
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={monthlyData}>
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} name="Expenses" />
                                <Area type="monotone" dataKey="incomes" stroke="#10B981" fill="#10B981" fillOpacity={0.1} name="Incomes" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState title="No data yet" description="Add expenses and incomes to see trends" />
                    )}
                </div>

                {/* Category breakdown */}
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="text-base font-semibold text-ink mb-4">Categories</h3>
                    {categoryData.length > 0 ? (
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={65}>
                                        {categoryData.map((entry) => (
                                            <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6B7280'} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {categoryData.slice(0, 5).map((c) => (
                                    <div key={c.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[c.name] || '#6B7280' }} />
                                            <span className="text-ink capitalize">{c.name.toLowerCase()}</span>
                                        </div>
                                        <span className="font-medium text-ink">{fmt(c.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState title="No expenses" description="Categories will appear here" />
                    )}
                </div>
            </div>

            {/* Recent transactions */}
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">Recent Expenses</h3>
                {recentExpenses.length > 0 ? (
                    <div className="space-y-3">
                        {recentExpenses.map((e) => (
                            <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                                <div>
                                    <p className="text-sm font-medium text-ink">{e.description}</p>
                                    <p className="text-xs text-muted">{e.date} &middot; {(e.category || 'other').toLowerCase()}</p>
                                </div>
                                <span className="text-sm font-semibold text-error">{fmt(e.amount)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState title="No expenses yet" description="Your recent expenses will show up here" />
                )}
            </div>
        </div>
    );
}
