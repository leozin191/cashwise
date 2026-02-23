import { useState, useEffect, useRef } from 'react';
import { authService } from '../services/api';
import { useAuth } from '../contexts/useAuth';

export default function ChooseUsernamePage() {
    const { updateUser, logout } = useAuth();
    const [username, setUsername] = useState('');
    const [status, setStatus] = useState(null); // 'checking' | 'available' | 'taken' | 'invalid'
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef(null);

    const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

    useEffect(() => {
        if (!username) {
            setStatus(null);
            return;
        }
        if (!USERNAME_REGEX.test(username)) {
            setStatus('invalid');
            return;
        }
        setStatus('checking');
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await authService.checkUsername(username);
                setStatus(res.available ? 'available' : 'taken');
            } catch {
                setStatus(null);
            }
        }, 500);
        return () => clearTimeout(debounceRef.current);
    }, [username]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status !== 'available') return;
        setSaving(true);
        setError('');
        try {
            await authService.setUsername(username);
            updateUser({ username });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set username');
        } finally {
            setSaving(false);
        }
    };

    const statusColor =
        status === 'available' ? 'text-emerald-600' :
        status === 'taken' ? 'text-red-500' :
        status === 'invalid' ? 'text-yellow-600' : 'text-muted';

    const statusMsg =
        status === 'checking' ? 'Checking…' :
        status === 'available' ? '@' + username + ' is available' :
        status === 'taken' ? 'Username already taken' :
        status === 'invalid' ? '3–20 chars, lowercase letters, numbers, underscores only' : '';

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

                <h2 className="text-2xl font-bold text-ink mb-1">Choose a username</h2>
                <p className="text-sm text-muted mb-6">
                    Your unique handle for CashWise. You can use it to receive household invitations.
                </p>

                {error && (
                    <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1.5">Username</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                placeholder="yourname"
                                className="w-full pl-7 pr-4 py-3 rounded-xl border border-border bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                autoFocus
                                autoComplete="off"
                            />
                        </div>
                        {statusMsg && (
                            <p className={`text-xs mt-1.5 ${statusColor}`}>{statusMsg}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status !== 'available' || saving}
                        className="w-full py-3 rounded-xl gradient-bg text-white font-semibold text-sm disabled:opacity-50 cursor-pointer border-none"
                    >
                        {saving ? 'Saving…' : 'Continue'}
                    </button>
                </form>

                <button
                    onClick={logout}
                    className="w-full mt-4 text-center text-xs text-muted hover:text-ink bg-transparent border-none cursor-pointer"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
