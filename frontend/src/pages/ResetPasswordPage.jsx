import { useState } from 'react';
import { authService } from '../services/api';

export default function ResetPasswordPage({ token, onSuccess, onBack }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await authService.resetPassword(token, password);
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired reset link. Please request a new one.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white font-bold">CW</div>
                    <div>
                        <h1 className="text-xl font-bold text-ink">CashWise</h1>
                        <p className="text-xs text-muted">Finance Tracker</p>
                    </div>
                </div>

                {done ? (
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h2 className="text-xl font-bold text-ink mb-2">Password updated!</h2>
                        <p className="text-sm text-muted mb-6">Your password has been reset successfully. You can now sign in with your new password.</p>
                        <button onClick={onSuccess} className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark cursor-pointer border-none">
                            Sign in
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-ink mb-1">Set new password</h2>
                        <p className="text-sm text-muted mb-6">Choose a strong password for your account.</p>

                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1.5">New password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1.5">Confirm password</label>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    placeholder="Repeat your new password"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer border-none"
                            >
                                {loading ? 'Saving...' : 'Set new password'}
                            </button>
                        </form>

                        <p className="text-sm text-center text-muted mt-6">
                            <button onClick={onBack} className="text-primary font-semibold hover:underline cursor-pointer bg-transparent border-none">
                                Back to sign in
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
