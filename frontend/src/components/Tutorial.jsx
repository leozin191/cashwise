import { useState } from 'react';

const STEPS = [
    {
        title: 'Welcome to CashWise!',
        description: 'Your personal finance tracker. Let\'s take a quick tour of what you can do.',
        gradient: 'from-primary to-primary-light',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    },
    {
        title: 'Track Expenses',
        description: 'Log your spending with AI-powered category suggestions. Filter, edit, and analyze with ease.',
        gradient: 'from-error to-accent',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    },
    {
        title: 'Record Incomes',
        description: 'Keep track of all your income sources — salary, freelance, investments, and more.',
        gradient: 'from-success to-primary-light',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    },
    {
        title: 'Manage Subscriptions',
        description: 'Never lose track of recurring payments. Toggle, edit, and auto-generate expenses.',
        gradient: 'from-cat-housing to-cat-entertainment',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
    },
    {
        title: 'View Reports',
        description: 'Visualize your finances with charts — expense trends, income comparison, category breakdowns.',
        gradient: 'from-cat-education to-primary',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    },
];

export default function Tutorial({ onComplete }) {
    const [step, setStep] = useState(0);
    const current = STEPS[step];

    const next = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            localStorage.setItem('cashwise_tutorial_done', 'true');
            onComplete();
        }
    };

    const skip = () => {
        localStorage.setItem('cashwise_tutorial_done', 'true');
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className={`rounded-3xl p-8 text-white bg-gradient-to-br ${current.gradient} shadow-2xl`}>
                    <div className="flex justify-center mb-6 opacity-90">{current.icon}</div>
                    <h2 className="text-2xl font-bold text-center mb-3">{current.title}</h2>
                    <p className="text-center text-white/80 text-sm leading-relaxed">{current.description}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-6 px-2">
                    <button onClick={skip} className="text-sm text-muted hover:text-ink cursor-pointer bg-transparent border-none">
                        Skip tour
                    </button>

                    {/* Dots */}
                    <div className="flex gap-2">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    i === step ? 'bg-primary' : 'bg-border'
                                }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={next}
                        className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:bg-primary-dark transition-colors"
                    >
                        {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
                    </button>
                </div>
            </div>
        </div>
    );
}
