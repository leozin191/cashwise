import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Tutorial from './components/Tutorial';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import IncomesPage from './pages/IncomesPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

const PAGES = {
    dashboard: DashboardPage,
    expenses: ExpensesPage,
    incomes: IncomesPage,
    subscriptions: SubscriptionsPage,
    reports: ReportsPage,
    settings: SettingsPage,
};

function AppContent() {
    const { user, loading } = useAuth();
    const [authMode, setAuthMode] = useState('login');
    const [activePage, setActivePage] = useState('dashboard');
    const [showTutorial, setShowTutorial] = useState(false);

    const [checkedTutorial, setCheckedTutorial] = useState(false);
    if (user && !checkedTutorial) {
        setCheckedTutorial(true);
        if (!localStorage.getItem('cashwise_tutorial_done')) {
            setShowTutorial(true);
        }
    }
    if (!user && checkedTutorial) {
        setCheckedTutorial(false);
    }

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
        return authMode === 'login'
            ? <LoginPage onSwitch={() => setAuthMode('register')} />
            : <RegisterPage onSwitch={() => setAuthMode('login')} />;
    }

    const PageComponent = PAGES[activePage] || DashboardPage;

    return (
        <>
            {showTutorial && <Tutorial onComplete={() => setShowTutorial(false)} />}
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
