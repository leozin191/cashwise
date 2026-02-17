const assert = require('assert');

const normalizeCategory = (category) => {
    const map = {
        Lazer: 'Entertainment',
        'Alimentação': 'Groceries',
        Transporte: 'Transport',
        Outros: 'General',
        Compras: 'Shopping',
        Moradia: 'Utilities',
        Saúde: 'Health',
        Educação: 'Services',
        Comida: 'Food',
    };
    if (!category) return 'General';
    return map[category] || category;
};

const filterByThisMonth = (items, now) => {
    const safeItems = Array.isArray(items) ? items : [];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return safeItems.filter((item) => {
        const date = new Date(item.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
};

const filterByLast30Days = (items, now) => {
    const safeItems = Array.isArray(items) ? items : [];
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return safeItems.filter((item) => {
        const date = new Date(item.date);
        return date >= thirtyDaysAgo && date <= now;
    });
};

const getCategoryExpenses = (items, selectedCategory) => {
    if (!selectedCategory) return [];
    const selectedKey = normalizeCategory(selectedCategory);
    return items.filter((item) => normalizeCategory(item.category) === selectedKey);
};

const rates = {
    EUR: 1,
    BRL: 5,
    USD: 2,
};

const convertToEUR = (amount, fromCurrency) => {
    if (fromCurrency === 'EUR') return amount;
    return amount / (rates[fromCurrency] || 1);
};

const expenses = [
    { id: 1, amount: 100, date: '2026-02-10', currency: 'BRL', category: 'Comida' },
    { id: 2, amount: 50, date: '2026-02-12', currency: 'EUR', category: 'Food' },
    { id: 3, amount: 20, date: '2026-02-01', currency: 'USD', category: 'Transport' },
    { id: 4, amount: 40, date: '2026-01-20', currency: 'BRL', category: 'Comida' },
    { id: 5, amount: 10, date: '2026-01-10', currency: 'EUR', category: 'Food' },
];

const incomes = [
    { id: 1, amount: 200, date: '2026-02-05', currency: 'EUR' },
    { id: 2, amount: 50, date: '2026-02-07', currency: 'USD' },
    { id: 3, amount: 100, date: '2026-01-05', currency: 'BRL' },
];

const now = new Date('2026-02-15T00:00:00Z');

const monthExpenses = filterByThisMonth(expenses, now);
assert.equal(monthExpenses.length, 3);

const last30 = filterByLast30Days(expenses, now);
assert.equal(last30.length, 4);

const comidaExpenses = getCategoryExpenses(monthExpenses, 'Comida');
assert.equal(comidaExpenses.length, 2);

const totalsByCurrency = monthExpenses.reduce((acc, exp) => {
    const code = exp.currency || 'EUR';
    acc[code] = (acc[code] || 0) + (Number(exp.amount) || 0);
    return acc;
}, {});
assert.deepEqual(totalsByCurrency, { BRL: 100, EUR: 50, USD: 20 });

const spentEUR = monthExpenses
    .map((exp) => convertToEUR(exp.amount, exp.currency || 'EUR'))
    .reduce((sum, val) => sum + val, 0);
const monthIncomes = filterByThisMonth(incomes, now);
const incomeEUR = monthIncomes
    .map((inc) => convertToEUR(inc.amount, inc.currency || 'EUR'))
    .reduce((sum, val) => sum + val, 0);

assert.equal(spentEUR, 80);
assert.equal(incomeEUR, 225);
assert.equal(incomeEUR - spentEUR, 145);

console.log('OK: home summary totals, category filter, and date filters match expectations.');
