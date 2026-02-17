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

const convertToCurrency = (items, targetCurrency) => {
    return (items || []).map((item) => {
        const amount = Number(item.amount) || 0;
        const amountEUR = convertToEUR(amount, item.currency || 'EUR');
        return {
            ...item,
            amount: convert(amountEUR, targetCurrency),
            currency: targetCurrency,
        };
    });
};

const approxEqual = (actual, expected, epsilon = 1e-6) => {
    assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to ~= ${expected}`);
};

const expenses = [
    { id: 1, amount: 200, date: '2026-02-10', currency: 'EUR', description: 'Laptop (1/3)' },
    { id: 2, amount: 300, date: '2026-02-05', currency: 'BRL', description: 'Pizza' },
    { id: 3, amount: 50, date: '2026-01-20', currency: 'USD', description: 'Taxi' },
];

const incomes = [
    { id: 10, amount: 1000, date: '2026-02-02', currency: 'EUR', description: 'Salary' },
    { id: 11, amount: 500, date: '2026-02-15', currency: 'USD', description: 'Freelance' },
];

const monthKey = '2026-02';
const selectedCurrency = 'BRL';

const monthExpenses = filterByMonthKey(expenses, monthKey);
const monthIncomes = filterByMonthKey(incomes, monthKey);

const convertedExpenses = convertToCurrency(monthExpenses, selectedCurrency);
const convertedIncomes = convertToCurrency(monthIncomes, selectedCurrency);

const totalExpenses = convertedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
const totalIncome = convertedIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
const balanceTotal = totalIncome - totalExpenses;

approxEqual(totalExpenses, 1300);
approxEqual(totalIncome, 7000);
approxEqual(balanceTotal, 5700);

console.log('OK: export totals include income and balance in selected currency.');
