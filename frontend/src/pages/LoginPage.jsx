import { useState } from 'react';
import { useAuth } from '../contexts/useAuth';

export default function LoginPage({ onSwitch, onForgot }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8">
                {/* Brand */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white font-bold">CW</div>
                    <div>
                        <h1 className="text-xl font-bold text-ink">CashWise</h1>
                        <p className="text-xs text-muted">Finance Tracker</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-ink mb-1">Welcome back</h2>
                <p className="text-sm text-muted mb-6">Sign in to your account</p>

                {error && (
                    <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-4">
                        {error}
                    </div>
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
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-ink">Password</label>
                            {onForgot && (
                                <button type="button" onClick={onForgot} className="text-xs text-primary font-medium hover:underline cursor-pointer bg-transparent border-none">
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder="Enter your password"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer border-none"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <p className="text-sm text-center text-muted mt-6">
                    Don&apos;t have an account?{' '}
                    <button onClick={onSwitch} className="text-primary font-semibold hover:underline cursor-pointer bg-transparent border-none">
                        Create one
                    </button>
                </p>
            </div>
        </div>
    );
}
