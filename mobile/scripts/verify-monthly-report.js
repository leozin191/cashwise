const assert = require('assert');

const getMonthKey = (dateValue) => {
    if (!dateValue) return null;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const filterByMonthKey = (items, monthKey) => {
    const safeItems = Array.isArray(items) ? items : [];
    if (!monthKey) return safeItems;
    return safeItems.filter((item) => getMonthKey(item?.date) === monthKey);
};

const rates = {
    EUR: 1,
    BRL: 5,
    USD: 1.25,
};

const convertToEUR = (amount, fromCurrency) => {
    if (fromCurrency === 'EUR') return amount;
    return amount / (rates[fromCurrency] || 1);
};

const convert = (amountInEUR, toCurrency) => {
    if (toCurrency === 'EUR') return amountInEUR;
    return amountInEUR * (rates[toCurrency] || 1);
};

const approxEqual = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to ~= ${expected}`);
};

const groupByMonth = (items, amountKey = 'amount') => {
    const grouped = {};
    items.forEach((item) => {
        const key = getMonthKey(item?.date);
        if (!key) return;
        grouped[key] = (grouped[key] || 0) + (Number(item[amountKey]) || 0);
    });
    return grouped;
};

const calculateForecastForMonths = (months, expensesList, subscriptionsList) => {
    const installmentRegex = /\((\d+)\/(\d+)\)$/;
    const safeExpenses = Array.isArray(expensesList) ? expensesList : [];
    const activeSubscriptions = (subscriptionsList || []).filter((sub) => sub.active);
    let subscriptionsTotal = 0;

    activeSubscriptions.forEach((sub) => {
        let monthly = Number(sub.amount) || 0;
        if (sub.frequency === 'YEARLY') monthly /= 12;
        subscriptionsTotal += monthly;
    });

    return months.map((monthInfo) => {
        const installmentExpenses = safeExpenses.filter((exp) => {
            const date = new Date(exp.date);
            return date.getMonth() === monthInfo.month
                && date.getFullYear() === monthInfo.year
                && installmentRegex.test(exp.description || '');
        });
        const installmentsTotal = installmentExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        return {
            ...monthInfo,
            subscriptionsTotal,
            installmentsTotal,
            combinedTotal: subscriptionsTotal + installmentsTotal,
        };
    });
};

const expenses = [
    { id: 1, amount: 300, date: '2026-02-10', currency: 'BRL' },
    { id: 2, amount: 15, date: '2026-02-20', currency: 'BRL' },
    { id: 3, amount: 50, date: '2026-02-05', currency: 'EUR' },
    { id: 4, amount: 99, date: '2026-01-20', currency: 'BRL' },
    { id: 5, amount: 10, date: '2026-01-22', currency: 'USD' },
];

const incomes = [
    { id: 1, amount: 1000, date: '2026-02-02', currency: 'EUR' },
    { id: 2, amount: 250, date: '2026-02-10', currency: 'USD' },
    { id: 3, amount: 200, date: '2026-01-05', currency: 'BRL' },
];

const monthKey = '2026-02';
const previousMonthKey = '2026-01';

const filtered = filterByMonthKey(expenses, monthKey);
const total = filtered.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
assert.equal(total, 365);

const totalsByCurrency = filtered.reduce((acc, expense) => {
    const code = expense.currency || 'EUR';
    acc[code] = (acc[code] || 0) + (Number(expense.amount) || 0);
    return acc;
}, {});
assert.deepEqual(totalsByCurrency, { BRL: 315, EUR: 50 });

const convertedExpenses = expenses.map((expense) => ({
    ...expense,
    _amountEUR: convertToEUR(expense.amount, expense.currency || 'EUR'),
}));
const convertedIncomes = incomes.map((income) => ({
    ...income,
    _amountEUR: convertToEUR(income.amount, income.currency || 'EUR'),
}));

const currentExpensesEUR = filterByMonthKey(convertedExpenses, monthKey)
    .reduce((sum, exp) => sum + (exp._amountEUR || 0), 0);
const lastExpensesEUR = filterByMonthKey(convertedExpenses, previousMonthKey)
    .reduce((sum, exp) => sum + (exp._amountEUR || 0), 0);
const currentIncomesEUR = filterByMonthKey(convertedIncomes, monthKey)
    .reduce((sum, inc) => sum + (inc._amountEUR || 0), 0);

approxEqual(currentExpensesEUR, 113);
approxEqual(lastExpensesEUR, 99 / 5 + 10 / 1.25);
approxEqual(currentIncomesEUR, 1000 + 250 / 1.25);

const groupedEUR = groupByMonth(convertedExpenses, '_amountEUR');
approxEqual(groupedEUR['2026-02'], 113);
approxEqual(groupedEUR['2026-01'], 99 / 5 + 10 / 1.25);

const febTotalInBRL = convert(groupedEUR['2026-02'], 'BRL');
approxEqual(febTotalInBRL, 565);

const forecastMonths = [
    { month: 2, year: 2026, label: 'Mar 2026', fullLabel: 'March 2026' },
    { month: 3, year: 2026, label: 'Apr 2026', fullLabel: 'April 2026' },
    { month: 4, year: 2026, label: 'May 2026', fullLabel: 'May 2026' },
];
const forecastExpenses = [
    { amount: 300, date: '2026-03-10', description: 'Laptop (1/3)' },
    { amount: 300, date: '2026-04-10', description: 'Laptop (2/3)' },
    { amount: 300, date: '2026-05-10', description: 'Laptop (3/3)' },
];
const forecastSubscriptions = [
    { amount: 50, frequency: 'MONTHLY', active: true },
    { amount: 120, frequency: 'YEARLY', active: true },
];
const forecast = calculateForecastForMonths(forecastMonths, forecastExpenses, forecastSubscriptions);
approxEqual(forecast[0].subscriptionsTotal, 60);
approxEqual(forecast[0].installmentsTotal, 300);
approxEqual(forecast[0].combinedTotal, 360);
approxEqual(forecast[1].combinedTotal, 360);
approxEqual(forecast[2].combinedTotal, 360);

console.log('OK: monthly totals, conversion logic, and grouping match expectations.');
