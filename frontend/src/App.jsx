import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Tutorial from './components/Tutorial';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import IncomesPage from './pages/IncomesPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ReportsPage from './pages/ReportsPage';
import BudgetsPage from './pages/BudgetsPage';
import SettingsPage from './pages/SettingsPage';
import ChooseUsernamePage from './pages/ChooseUsernamePage';

const PAGES = {
    dashboard: DashboardPage,
    expenses: ExpensesPage,
    incomes: IncomesPage,
    subscriptions: SubscriptionsPage,
    reports: ReportsPage,
    budgets: BudgetsPage,
    settings: SettingsPage,
};

function AppContent() {
    const { user, loading } = useAuth();
    const resetToken = new URLSearchParams(window.location.search).get('reset_token');
    const [authMode, setAuthMode] = useState(resetToken ? 'reset' : 'login');

    // Remove the token from the URL immediately so it doesn't linger in browser history
    useEffect(() => {
        if (resetToken) {
            window.history.replaceState({}, '', '/');
        }
    }, []);
    const [activePage, setActivePage] = useState('dashboard');
    const [tutorialDismissedFor, setTutorialDismissedFor] = useState(null);

    const currentUserKey = user
        ? String(user.id ?? user.email ?? user.username ?? '')
        : null;

    const showTutorial = Boolean(user) &&
        tutorialDismissedFor !== currentUserKey &&
        !localStorage.getItem('cashwise_tutorial_done');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">CW</div>
                    <p className="text-sm font-medium text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        if (authMode === 'forgot') return <ForgotPasswordPage onBack={() => setAuthMode('login')} />;
        if (authMode === 'reset') return (
            <ResetPasswordPage
                token={resetToken || ''}
                onSuccess={() => { window.history.replaceState({}, '', '/'); setAuthMode('login'); }}
                onBack={() => { window.history.replaceState({}, '', '/'); setAuthMode('login'); }}
            />
        );
        return authMode === 'login'
            ? <LoginPage onSwitch={() => setAuthMode('register')} onForgot={() => setAuthMode('forgot')} />
            : <RegisterPage onSwitch={() => setAuthMode('login')} />;
    }

    if (!user.username) {
        return <ChooseUsernamePage />;
    }

    const PageComponent = PAGES[activePage] || DashboardPage;

    return (
        <>
            {showTutorial && <Tutorial onComplete={() => setTutorialDismissedFor(currentUserKey)} />}
            <Layout activePage={activePage} onNavigate={setActivePage}>
                <PageComponent />
            </Layout>
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </AuthProvider>
    );
}
