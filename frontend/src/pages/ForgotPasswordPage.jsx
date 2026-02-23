import { useState } from 'react';
import { authService } from '../services/api';

export default function ForgotPasswordPage({ onBack }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authService.forgotPassword(email);
            setSent(true);
        } catch {
            setError('Something went wrong. Please try again.');
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

                {sent ? (
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h2 className="text-xl font-bold text-ink mb-2">Check your email</h2>
                        <p className="text-sm text-muted mb-6">If an account exists for <span className="font-medium text-ink">{email}</span>, you&apos;ll receive a password reset link shortly.</p>
                        <button onClick={onBack} className="text-sm text-primary font-semibold hover:underline cursor-pointer bg-transparent border-none">
                            Back to sign in
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-ink mb-1">Forgot password?</h2>
                        <p className="text-sm text-muted mb-6">Enter your email and we&apos;ll send you a reset link.</p>

                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer border-none"
                            >
                                {loading ? 'Sending...' : 'Send reset link'}
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
