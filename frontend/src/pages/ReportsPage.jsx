import { useState, useEffect, useMemo } from 'react';
import { expenseService, incomeService } from '../services/api';
import { useToast } from '../components/useToast';
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
        Promise.all([expenseService.getAll(), incomeService.getAll()])
            .then(([exp, inc]) => { setExpenses(exp); setIncomes(inc); })
            .catch(() => toast.error('Failed to load report data'))
            .finally(() => setLoading(false));
    }, [toast]);

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

    const handleExportPdf = () => {
        const rows = topExpenses.map((e) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.date || ''}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${e.description || ''}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${(e.category || 'other').toLowerCase()}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#EF4444;font-weight:600">${fmt(e.amount)}</td>
            </tr>`).join('');

        const catRows = categoryPie.map((c) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${c.name.toLowerCase()}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#EF4444;font-weight:600">${fmt(c.value)}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>CashWise Report ${dateFrom} – ${dateTo}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  p.sub { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .cards { display: flex; gap: 16px; margin-bottom: 28px; }
  .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  .card-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
  .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px; }
  th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing:.05em; color:#6b7280; border-bottom: 2px solid #e5e7eb; }
  tr:last-child td { border-bottom: none !important; }
  h2 { font-size: 15px; margin: 20px 0 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>CashWise Financial Report</h1>
<p class="sub">Period: ${dateFrom} to ${dateTo} &nbsp;|&nbsp; Generated ${new Date().toLocaleDateString()}</p>
<div class="cards">
  <div class="card"><div class="card-label">Total Expenses</div><div class="card-value" style="color:#EF4444">${fmt(totalExp)}</div></div>
  <div class="card"><div class="card-label">Total Income</div><div class="card-value" style="color:#10B981">${fmt(totalInc)}</div></div>
  <div class="card"><div class="card-label">Net Balance</div><div class="card-value" style="color:${totalInc - totalExp >= 0 ? '#10B981' : '#EF4444'}">${fmt(totalInc - totalExp)}</div></div>
</div>
<h2>Expenses by Category</h2>
<table><thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead><tbody>${catRows || '<tr><td colspan="2" style="padding:8px 12px;color:#6b7280">No data</td></tr>'}</tbody></table>
<h2>Top Expenses</h2>
<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="padding:8px 12px;color:#6b7280">No data</td></tr>'}</tbody></table>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
            win.onload = () => { win.print(); URL.revokeObjectURL(url); };
        }
    };

    if (loading) return <div className="flex justify-center py-20"><p className="text-muted font-medium">Loading...</p></div>;

    return (
        <div className="space-y-6">
            {/* Date range */}
            <div className="flex flex-wrap gap-3 items-end justify-between">
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
                <button
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:bg-primary-dark"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export PDF
                </button>
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
