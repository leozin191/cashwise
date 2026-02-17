import { useState, useEffect, useMemo } from 'react';
import { expenseService, incomeService } from '../services/api';
import { useToast } from '../components/Toast';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CATEGORY_COLORS = {
    FOOD: '#F97316', TRANSPORT: '#3B82F6', HOUSING: '#8B5CF6',
    ENTERTAINMENT: '#EC4899', HEALTH: '#10B981', SHOPPING: '#F43F5E',
    EDUCATION: '#6366F1', UTILITIES: '#14B8A6', OTHER: '#6B7280',
};

export default function ReportsPage() {
    const [expenses, setExpenses] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
    const toast = useToast();

    useEffect(() => {
        setLoading(true);
        Promise.all([expenseService.getAll(), incomeService.getAll()])
            .then(([exp, inc]) => { setExpenses(exp); setIncomes(inc); })
            .catch(() => toast.error('Failed to load report data'))
            .finally(() => setLoading(false));
    }, []);

    const filteredExpenses = useMemo(() =>
        expenses.filter((e) => (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo)),
        [expenses, dateFrom, dateTo]
    );
    const filteredIncomes = useMemo(() =>
        incomes.filter((i) => (!dateFrom || i.date >= dateFrom) && (!dateTo || i.date <= dateTo)),
        [incomes, dateFrom, dateTo]
    );

    const totalExp = useMemo(() => filteredExpenses.reduce((s, e) => s + Number(e.amount), 0), [filteredExpenses]);
    const totalInc = useMemo(() => filteredIncomes.reduce((s, i) => s + Number(i.amount), 0), [filteredIncomes]);

    const monthlyChart = useMemo(() => {
        const map = {};
        filteredExpenses.forEach((e) => {
            const m = e.date?.slice(0, 7);
            if (m) map[m] = { ...map[m], month: m, expenses: (map[m]?.expenses || 0) + Number(e.amount) };
        });
        filteredIncomes.forEach((i) => {
            const m = i.date?.slice(0, 7);
            if (m) map[m] = { ...map[m], month: m, incomes: (map[m]?.incomes || 0) + Number(i.amount) };
        });
        return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    }, [filteredExpenses, filteredIncomes]);

    const categoryPie = useMemo(() => {
        const map = {};
        filteredExpenses.forEach((e) => {
            const cat = e.category || 'OTHER';
            map[cat] = (map[cat] || 0) + Number(e.amount);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
    }, [filteredExpenses]);

    const topExpenses = useMemo(() =>
        [...filteredExpenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 10),
        [filteredExpenses]
    );

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

    if (loading) return <div className="flex justify-center py-20"><p className="text-muted font-medium">Loading...</p></div>;

    return (
        <div className="space-y-6">
            {/* Date range */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-muted mb-1">From</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                    <label className="block text-xs text-muted mb-1">To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Expenses" value={fmt(totalExp)} color="text-error" icon="$" />
                <StatCard label="Total Income" value={fmt(totalInc)} color="text-success" icon="+" />
                <StatCard label="Net Balance" value={fmt(totalInc - totalExp)} color={totalInc - totalExp >= 0 ? 'text-success' : 'text-error'} icon="=" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense vs Income area chart */}
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="text-base font-semibold text-ink mb-4">Expenses vs Income</h3>
                    {monthlyChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={monthlyChart}>
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} name="Expenses" />
                                <Area type="monotone" dataKey="incomes" stroke="#10B981" fill="#10B981" fillOpacity={0.1} name="Incomes" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState title="No data" description="Adjust the date range" />
                    )}
                </div>

                {/* Category pie */}
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="text-base font-semibold text-ink mb-4">Expense Categories</h3>
                    {categoryPie.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={categoryPie} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.toLowerCase()} ${(percent * 100).toFixed(0)}%`}>
                                    {categoryPie.map((entry) => (
                                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6B7280'} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => fmt(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState title="No expenses" description="Categories will appear here" />
                    )}
                </div>
            </div>

            {/* Top expenses */}
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">Top Expenses</h3>
                {topExpenses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-4 py-2 text-xs text-muted uppercase tracking-wide font-semibold">Date</th>
                                    <th className="text-left px-4 py-2 text-xs text-muted uppercase tracking-wide font-semibold">Description</th>
                                    <th className="text-left px-4 py-2 text-xs text-muted uppercase tracking-wide font-semibold">Category</th>
                                    <th className="text-right px-4 py-2 text-xs text-muted uppercase tracking-wide font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topExpenses.map((e) => (
                                    <tr key={e.id} className="border-b border-border last:border-b-0">
                                        <td className="px-4 py-2 text-muted">{e.date}</td>
                                        <td className="px-4 py-2 font-medium text-ink">{e.description}</td>
                                        <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{(e.category || 'other').toLowerCase()}</span></td>
                                        <td className="px-4 py-2 text-right font-semibold text-error">{fmt(e.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState title="No expenses in range" description="Adjust the date range to see results" />
                )}
            </div>
        </div>
    );
}
