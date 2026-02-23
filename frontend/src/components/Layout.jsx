import { useAuth } from '../contexts/useAuth';

const NAV_ITEMS = [
    { id: 'dashboard',     label: 'Dashboard',      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { id: 'expenses',      label: 'Expenses',       icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { id: 'incomes',       label: 'Incomes',        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
    { id: 'subscriptions', label: 'Subscriptions',  icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg> },
    { id: 'reports',       label: 'Reports',        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { id: 'budgets',       label: 'Budgets',        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
    { id: 'settings',      label: 'Settings',       icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
];

export default function Layout({ activePage, onNavigate, children }) {
    const { user, logout } = useAuth();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const activeItem = NAV_ITEMS.find((n) => n.id === activePage);

    return (
        <div className="grid grid-cols-[260px_1fr] min-h-screen max-lg:grid-cols-1">
            {/* Sidebar */}
            <aside className="bg-white/95 border-r border-border flex flex-col p-5 gap-6 sticky top-0 h-screen max-lg:static max-lg:h-auto max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:gap-4">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-sm">CW</div>
                    <div>
                        <div className="font-bold text-ink">CashWise</div>
                        <div className="text-xs text-muted">Finance Tracker</div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1.5 max-lg:flex-row max-lg:flex-wrap">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors border border-transparent text-left ${
                                activePage === item.id
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'text-muted hover:bg-canvas hover:text-ink'
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User card */}
                <div className="mt-auto p-4 rounded-2xl bg-canvas border border-border max-lg:w-full max-lg:mt-0">
                    <div className="text-sm font-semibold text-ink">{user?.name || 'User'}</div>
                    <div className="text-xs text-muted truncate">{user?.email}</div>
                    <button
                        onClick={logout}
                        className="mt-3 w-full text-xs font-semibold text-error hover:text-error/80 cursor-pointer bg-transparent border-none text-left"
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="p-8 max-md:p-5">
                {/* Topbar */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-primary font-semibold">{activeItem?.label}</p>
                        <h1 className="text-2xl font-bold text-ink mt-0.5">{activeItem?.label}</h1>
                    </div>
                    <p className="text-sm text-muted">{today}</p>
                </div>

                {children}
            </main>
        </div>
    );
}
