import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('cashwise_token');
        setUser(null);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('cashwise_token');
        if (!token) {
            setLoading(false);
            return;
        }
        authService.getProfile()
            .then((profile) => setUser(profile))
            .catch(() => {
                localStorage.removeItem('cashwise_token');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const handler = () => logout();
        window.addEventListener('auth:logout', handler);
        return () => window.removeEventListener('auth:logout', handler);
    }, [logout]);

    const login = async (email, password) => {
        const res = await authService.login({ email, password });
        localStorage.setItem('cashwise_token', res.token);
        setUser({ name: res.name, email: res.email });
        return res;
    };

    const register = async (name, email, password) => {
        const res = await authService.register({ name, email, password });
        localStorage.setItem('cashwise_token', res.token);
        setUser({ name: res.name, email: res.email });
        return res;
    };

    const updateUser = (data) => {
        setUser((prev) => ({ ...prev, ...data }));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
