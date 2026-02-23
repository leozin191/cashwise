import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/api';
import { useToast } from '../components/useToast';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const CATEGORIES = ['FOOD', 'TRANSPORT', 'HOUSING', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'UTILITIES', 'OTHER'];
const FREQUENCIES = ['MONTHLY', 'YEARLY'];

const empty = { description: '', amount: '', currency: 'EUR', category: '', frequency: 'MONTHLY', dayOfMonth: 1, active: true };

export default function SubscriptionsPage() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ ...empty });
    const [editId, setEditId] = useState(null);
    const [editModal, setEditModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [processConfirm, setProcessConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    const load = useCallback(() => {
        subscriptionService.getAll()
            .then(setSubs)
            .catch(() => toast.error('Failed to load subscriptions'))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await subscriptionService.create({ ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth) });
            toast.success('Subscription added');
            setForm({ ...empty });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add subscription');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (sub) => {
        setEditId(sub.id);
        setForm({ description: sub.description, amount: sub.amount, currency: sub.currency || 'EUR', category: sub.category || '', frequency: sub.frequency || 'MONTHLY', dayOfMonth: sub.dayOfMonth || 1, active: sub.active });
        setEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await subscriptionService.update(editId, { ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth) });
            toast.success('Subscription updated');
            setEditModal(false);
            setForm({ ...empty });
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            await subscriptionService.toggle(id);
            load();
        } catch {
            toast.error('Failed to toggle subscription');
        }
    };

    const handleDelete = async () => {
        try {
            await subscriptionService.delete(deleteId);
            toast.success('Subscription deleted');
            setDeleteId(null);
            load();
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleProcess = async () => {
        try {
            const result = await subscriptionService.processNow();
            toast.success(`Processed ${result?.length || 0} subscriptions`);
            setProcessConfirm(false);
        } catch {
            toast.error('Failed to process subscriptions');
        }
    };

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

    if (loading) return <div className="flex justify-center py-20"><p className="text-muted font-medium">Loading...</p></div>;

    return (
        <div className="space-y-6">
            {/* Add form */}
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">Add Subscription</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-xs text-muted mb-1">Description</label>
                        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Netflix" />
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
                    <div>
                        <label className="block text-xs text-muted mb-1">Frequency</label>
                        <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-muted mb-1">Day</label>
                            <input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:bg-primary-dark disabled:opacity-50 whitespace-nowrap">
                            {submitting ? '...' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Process button */}
            <div className="flex justify-end">
                <button onClick={() => setProcessConfirm(true)} className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold cursor-pointer border-none hover:bg-accent-light">
                    Process Due Subscriptions
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                {subs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Active</th>
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Description</th>
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Category</th>
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Frequency</th>
                                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Amount</th>
                                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Next Due</th>
                                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wide font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subs.map((s) => (
                                    <tr key={s.id} className={`border-b border-border last:border-b-0 hover:bg-canvas/50 ${!s.active ? 'opacity-50' : ''}`}>
                                        <td className="px-5 py-3">
                                            <button
                                                onClick={() => handleToggle(s.id)}
                                                className={`w-10 h-5 rounded-full relative cursor-pointer border-none transition-colors ${s.active ? 'bg-success' : 'bg-gray-300'}`}
                                            >
                                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${s.active ? 'left-5' : 'left-0.5'}`} />
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 font-medium text-ink">{s.description}</td>
                                        <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{(s.category || 'other').toLowerCase()}</span></td>
                                        <td className="px-5 py-3 text-muted capitalize">{(s.frequency || 'monthly').toLowerCase()}</td>
                                        <td className="px-5 py-3 text-right font-semibold text-ink">{fmt(s.amount)}</td>
                                        <td className="px-5 py-3 text-muted">{s.nextDueDate || '-'}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline cursor-pointer bg-transparent border-none mr-3">Edit</button>
                                            <button onClick={() => setDeleteId(s.id)} className="text-xs text-error hover:underline cursor-pointer bg-transparent border-none">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState icon="R" title="No subscriptions" description="Add your recurring payments above" />
                )}
            </div>

            {/* Edit modal */}
            <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Subscription">
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
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1">Frequency</label>
                            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1">Day of Month</label>
                            <input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setEditModal(false)} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none disabled:opacity-50">{submitting ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirmation */}
            <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Subscription">
                <p className="text-sm text-muted mb-4">Are you sure you want to delete this subscription?</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-error text-white text-sm font-semibold cursor-pointer border-none">Delete</button>
                </div>
            </Modal>

            {/* Process confirmation */}
            <Modal open={processConfirm} onClose={() => setProcessConfirm(false)} title="Process Subscriptions">
                <p className="text-sm text-muted mb-4">This will generate expense entries for all active subscriptions that are due. Continue?</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setProcessConfirm(false)} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border">Cancel</button>
                    <button onClick={handleProcess} className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold cursor-pointer border-none">Process Now</button>
                </div>
            </Modal>
        </div>
    );
}
