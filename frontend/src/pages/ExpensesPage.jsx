import { useState, useEffect, useRef, useCallback } from 'react';
import { expenseService } from '../services/api';
import { useToast } from '../components/useToast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const CATEGORIES = ['FOOD', 'TRANSPORT', 'HOUSING', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'UTILITIES', 'OTHER'];

const empty = { description: '', amount: '', currency: 'EUR', date: new Date().toISOString().slice(0, 10), category: '' };

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ ...empty });
    const [editId, setEditId] = useState(null);
    const [editModal, setEditModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [suggestion, setSuggestion] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();
    const suggestTimer = useRef(null);

    const load = useCallback(() => {
        expenseService.getAll()
            .then(setExpenses)
            .catch(() => toast.error('Failed to load expenses'))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    // AI category suggestion with debounce
    const handleDescChange = (val) => {
        setForm((f) => ({ ...f, description: val }));
        clearTimeout(suggestTimer.current);
        if (val.length >= 3) {
            suggestTimer.current = setTimeout(async () => {
                try {
                    const res = await expenseService.suggestCategory(val);
                    if (res?.suggestedCategory) setSuggestion(res.suggestedCategory);
                } catch { /* ignore */ }
            }, 600);
        } else {
            setSuggestion('');
        }
    };

    const applySuggestion = () => {
        if (suggestion) {
            setForm((f) => ({ ...f, category: suggestion }));
            setSuggestion('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await expenseService.create({ ...form, amount: Number(form.amount) });
            toast.success('Expense added');
            setForm({ ...empty });
            setSuggestion('');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add expense');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (exp) => {
        setEditId(exp.id);
        setForm({ description: exp.description, amount: exp.amount, currency: exp.currency || 'EUR', date: exp.date, category: exp.category || '' });
        setEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await expenseService.update(editId, { ...form, amount: Number(form.amount) });
            toast.success('Expense updated');
            setEditModal(false);
            setForm({ ...empty });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await expenseService.delete(deleteId);
            toast.success('Expense deleted');
            setDeleteId(null);
            load();
        } catch {
            toast.error('Failed to delete');
        }
    };

    const filtered = expenses
        .filter((e) => !filterCat || e.category === filterCat)
        .filter((e) => !search || e.description?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

    if (loading) return <div className="flex justify-center py-20"><p className="text-muted font-medium">Loading...</p></div>;

    return (
        <div className="space-y-6">
            {/* Add form */}
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">Add Expense</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-xs text-muted mb-1">Description</label>
                        <input
                            value={form.description}
                            onChange={(e) => handleDescChange(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="e.g. Groceries at Lidl"
                        />
                        {suggestion && (
                            <button type="button" onClick={applySuggestion} className="mt-1 text-xs text-primary hover:underline cursor-pointer bg-transparent border-none">
                                AI suggests: <strong>{suggestion}</strong> — click to apply
                            </button>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Amount</label>
                        <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Category</label>
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Select...</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-muted mb-1">Date</label>
                            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:bg-primary-dark disabled:opacity-50 whitespace-nowrap">
                            {submitting ? '...' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-60" />
                <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                {filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Date</th>
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Description</th>
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Category</th>
                                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Amount</th>
                                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e) => (
                                    <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-canvas/50">
                                        <td className="px-5 py-3 text-muted">{e.date}</td>
                                        <td className="px-5 py-3 font-medium text-ink">{e.description}</td>
                                        <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{(e.category || 'other').toLowerCase()}</span></td>
                                        <td className="px-5 py-3 text-right font-semibold text-error">{fmt(e.amount)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => openEdit(e)} className="text-xs text-primary hover:underline cursor-pointer bg-transparent border-none mr-3">Edit</button>
                                            <button onClick={() => setDeleteId(e.id)} className="text-xs text-error hover:underline cursor-pointer bg-transparent border-none">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState icon="$" title="No expenses found" description="Add your first expense above" />
                )}
            </div>

            {/* Edit modal */}
            <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Expense">
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Description</label>
                        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1">Amount</label>
                            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1">Category</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Date</label>
                        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setEditModal(false)} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none disabled:opacity-50">{submitting ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirmation */}
            <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Expense">
                <p className="text-sm text-muted mb-4">Are you sure you want to delete this expense? This action cannot be undone.</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-error text-white text-sm font-semibold cursor-pointer border-none">Delete</button>
                </div>
            </Modal>
        </div>
    );
}
