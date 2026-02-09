import { CATEGORY_COLORS } from '../constants/categories';
import { calculateProgress, getAlertLevel } from './budgets';
import { groupByMonth, getLastNMonths } from './helpers';

const BAR_HEIGHT = 120;

const escapeHtml = (value) => {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const formatDate = (dateString, locale) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatLongDate = (date, locale) => {
    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const formatAmount = (value, currencySymbol) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${currencySymbol}${safeValue.toFixed(2)}`;
};

const getPeriodLabel = (expenses, locale, t) => {
    if (!expenses || expenses.length === 0) {
        return t ? t('reportPeriod') : 'Period';
    }

    const dates = expenses
        .map((exp) => new Date(exp.date))
        .filter((d) => !Number.isNaN(d.valueOf()))
        .sort((a, b) => a - b);

    if (dates.length === 0) {
        return t ? t('reportPeriod') : 'Period';
    }

    const start = formatDate(dates[0], locale);
    const end = formatDate(dates[dates.length - 1], locale);
    return `${start} - ${end}`;
};

const getAlertColor = (level) => {
    if (level === 'critical') return '#EF4444';
    if (level === 'warning') return '#F59E0B';
    return '#10B981';
};

export function generateReportHTML({
    expenses = [],
    subscriptions = [],
    budgets = {},
    forecast = [],
    monthlyData = [],
    stats = {},
    currencySymbol = '',
    language = 'pt',
    t,
}) {
    const locale = language === 'en' ? 'en-US' : 'pt-BR';
    const safeT = t || ((key) => key);
    const resolveCategoryLabel = (category) => {
        const translated = safeT(`categories.${category}`);
        return translated === `categories.${category}` ? category : translated;
    };
    const totalExpenses = Number.isFinite(stats.totalExpenses)
        ? stats.totalExpenses
        : expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const transactionCount = Number.isFinite(stats.transactionCount)
        ? stats.transactionCount
        : expenses.length;
    const averagePerDay = Number.isFinite(stats.averagePerDay) ? stats.averagePerDay : 0;
    const highestExpense = stats.highestExpense || null;
    const topCategory = stats.topCategory || null;
    const reportDate = formatLongDate(new Date(), locale);
    const periodLabel = getPeriodLabel(expenses, locale, safeT);

    const groupedByCategory = expenses.reduce((acc, exp) => {
        const category = exp.category || 'Other';
        if (!acc[category]) {
            acc[category] = { total: 0, count: 0 };
        }
        acc[category].total += exp.amount || 0;
        acc[category].count += 1;
        return acc;
    }, {});

    const categoryRows = Object.entries(groupedByCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([category, data]) => {
            const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
            const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other || '#9CA3AF';
            const categoryLabel = resolveCategoryLabel(category);

            return `
                <tr>
                    <td>
                        <span class="dot" style="background:${color}"></span>
                        ${escapeHtml(categoryLabel)}
                    </td>
                    <td>${data.count}</td>
                    <td>${formatAmount(data.total, currencySymbol)}</td>
                    <td>${percentage.toFixed(0)}%</td>
                </tr>
            `;
        })
        .join('');

    const lastMonths = monthlyData.length > 0 ? monthlyData : (() => {
        const months = getLastNMonths(6);
        const grouped = groupByMonth(expenses);
        return months.map((month) => ({
            label: month.label,
            value: grouped[month.key] || 0,
        }));
    })();

    const maxMonthValue = Math.max(...lastMonths.map((m) => m.value || 0), 1);
    const monthlyBars = lastMonths.map((month) => {
        const height = Math.max((month.value / maxMonthValue) * BAR_HEIGHT, 4);
        return `
            <div class="bar-item">
                <div class="bar" style="height:${height}px"></div>
                <div class="bar-label">${escapeHtml(month.label)}</div>
                <div class="bar-value">${formatAmount(month.value, currencySymbol)}</div>
            </div>
        `;
    }).join('');

    const currentMonth = new Date();
    const currentMonthExpenses = expenses.filter((exp) => {
        const date = new Date(exp.date);
        return date.getMonth() === currentMonth.getMonth()
            && date.getFullYear() === currentMonth.getFullYear();
    });

    const budgetRows = Object.entries(budgets)
        .map(([category, budget]) => {
            const spent = currentMonthExpenses
                .filter((exp) => exp.category === category)
                .reduce((sum, exp) => sum + (exp.amount || 0), 0);
            const limit = Number.isFinite(budget.limit) ? budget.limit : 0;
            const progress = calculateProgress(spent, limit);
            const level = getAlertLevel(progress);
            const color = getAlertColor(level);

            return `
                <tr>
                    <td>${escapeHtml(resolveCategoryLabel(category))}</td>
                    <td>${formatAmount(limit, currencySymbol)}</td>
                    <td>${formatAmount(spent, currencySymbol)}</td>
                    <td>
                        <div class="progress">
                            <div class="progress-fill" style="width:${Math.min(progress, 100)}%;background:${color}"></div>
                        </div>
                        <span class="progress-label" style="color:${color}">${progress.toFixed(0)}%</span>
                    </td>
                </tr>
            `;
        })
        .join('');

    const subscriptionRows = (subscriptions || [])
        .filter((sub) => sub.active)
        .map((sub) => {
            const frequencyLabel = {
                MONTHLY: safeT('monthly'),
                WEEKLY: safeT('weekly'),
                YEARLY: safeT('yearly'),
            }[sub.frequency] || sub.frequency;

            return `
                <tr>
                    <td>${escapeHtml(sub.description)}</td>
                    <td>${formatAmount(parseFloat(sub.amount), currencySymbol)}</td>
                    <td>${escapeHtml(frequencyLabel)}</td>
                    <td>${formatDate(sub.nextDueDate, locale)}</td>
                </tr>
            `;
        })
        .join('');

    const forecastRows = (forecast || [])
        .map((item) => `
            <tr>
                <td>${escapeHtml(item.fullLabel || item.label)}</td>
                <td>${formatAmount(item.subscriptionsTotal || 0, currencySymbol)}</td>
                <td>${formatAmount(item.installmentsTotal || 0, currencySymbol)}</td>
                <td>${formatAmount(item.combinedTotal || 0, currencySymbol)}</td>
            </tr>
        `)
        .join('');

    const detailedRows = expenses
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((exp) => `
            <tr>
                <td>${formatDate(exp.date, locale)}</td>
                <td>${escapeHtml(exp.description)}</td>
                <td>${escapeHtml(resolveCategoryLabel(exp.category))}</td>
                <td>${formatAmount(exp.amount, currencySymbol)}</td>
            </tr>
        `)
        .join('');

    return `
        <html>
            <head>
                <meta charset="utf-8" />
                <style>
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        padding: 24px;
                        font-family: Helvetica, Arial, sans-serif;
                        color: #111827;
                        background: #F9FAFB;
                    }
                    h1, h2, h3 { margin: 0; }
                    .header {
                        background: linear-gradient(135deg, #6366F1, #4F46E5);
                        color: #fff;
                        padding: 24px;
                        border-radius: 16px;
                    }
                    .header-title {
                        font-size: 28px;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                    }
                    .header-meta {
                        margin-top: 12px;
                        font-size: 12px;
                        opacity: 0.9;
                    }
                    .section {
                        margin-top: 24px;
                        background: #fff;
                        border-radius: 16px;
                        border: 1px solid #E5E7EB;
                        padding: 20px;
                    }
                    .section-title {
                        font-size: 18px;
                        font-weight: 700;
                        margin-bottom: 16px;
                        color: #1F2937;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                    }
                    .summary-card {
                        background: #F9FAFB;
                        border: 1px solid #E5E7EB;
                        border-radius: 12px;
                        padding: 12px;
                    }
                    .summary-label {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.6px;
                        color: #6B7280;
                        margin-bottom: 6px;
                    }
                    .summary-value {
                        font-size: 18px;
                        font-weight: 700;
                        color: #111827;
                    }
                    .summary-subtext {
                        font-size: 12px;
                        color: #6B7280;
                        margin-top: 4px;
                    }
                    .chart {
                        display: flex;
                        gap: 12px;
                        align-items: flex-end;
                        justify-content: space-between;
                        margin-top: 12px;
                    }
                    .bar-item {
                        flex: 1;
                        text-align: center;
                    }
                    .bar {
                        background: #6366F1;
                        border-radius: 8px 8px 4px 4px;
                        margin: 0 auto 6px auto;
                        width: 24px;
                    }
                    .bar-label {
                        font-size: 11px;
                        color: #6B7280;
                        text-transform: uppercase;
                    }
                    .bar-value {
                        font-size: 11px;
                        color: #9CA3AF;
                        margin-top: 2px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                    }
                    th, td {
                        padding: 8px 10px;
                        text-align: left;
                        border-bottom: 1px solid #E5E7EB;
                        vertical-align: top;
                    }
                    th {
                        background: #F3F4F6;
                        text-transform: uppercase;
                        font-size: 11px;
                        letter-spacing: 0.5px;
                        color: #6B7280;
                    }
                    .dot {
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        margin-right: 6px;
                        vertical-align: middle;
                    }
                    .progress {
                        width: 100%;
                        height: 8px;
                        background: #E5E7EB;
                        border-radius: 999px;
                        margin-bottom: 4px;
                        overflow: hidden;
                    }
                    .progress-fill {
                        height: 100%;
                        border-radius: 999px;
                    }
                    .progress-label {
                        font-size: 11px;
                        font-weight: 700;
                    }
                    .muted {
                        font-size: 12px;
                        color: #6B7280;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-title">${escapeHtml(safeT('reportTitle'))}</div>
                    <div class="header-meta">
                        ${escapeHtml(safeT('reportGenerated'))}: ${escapeHtml(reportDate)}<br />
                        ${escapeHtml(safeT('reportPeriod'))}: ${escapeHtml(periodLabel)}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('summarySection'))}</div>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="summary-label">${escapeHtml(safeT('totalExpenses'))}</div>
                            <div class="summary-value">${formatAmount(totalExpenses, currencySymbol)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">${escapeHtml(safeT('transactionCount'))}</div>
                            <div class="summary-value">${transactionCount}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">${escapeHtml(safeT('dailyAverage'))}</div>
                            <div class="summary-value">${formatAmount(averagePerDay, currencySymbol)}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">${escapeHtml(safeT('highestExpense'))}</div>
                            <div class="summary-value">
                                ${highestExpense ? formatAmount(highestExpense.amount, currencySymbol) : '-'}
                            </div>
                            <div class="summary-subtext">
                                ${highestExpense ? escapeHtml(highestExpense.description || '') : ''}
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">${escapeHtml(safeT('topCategory'))}</div>
                            <div class="summary-value">
                                ${topCategory ? escapeHtml(resolveCategoryLabel(topCategory.name)) : '-'}
                            </div>
                            <div class="summary-subtext">
                                ${topCategory ? `${topCategory.percentage}%` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('monthlyEvolution'))}</div>
                    <div class="chart">
                        ${monthlyBars}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('categoryBreakdown'))}</div>
                    ${categoryRows ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>${escapeHtml(safeT('category'))}</th>
                                    <th>${escapeHtml(safeT('transactionCount'))}</th>
                                    <th>${escapeHtml(safeT('total'))}</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categoryRows}
                            </tbody>
                        </table>
                    ` : `<div class="muted">${escapeHtml(safeT('noExpenses'))}</div>`}
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('budgetStatus'))}</div>
                    ${budgetRows ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>${escapeHtml(safeT('category'))}</th>
                                    <th>${escapeHtml(safeT('monthlyLimit'))}</th>
                                    <th>${escapeHtml(safeT('spent'))}</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${budgetRows}
                            </tbody>
                        </table>
                    ` : `<div class="muted">${escapeHtml(safeT('noBudgets'))}</div>`}
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('activeSubscriptions'))}</div>
                    ${subscriptionRows ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>${escapeHtml(safeT('description'))}</th>
                                    <th>${escapeHtml(safeT('amount'))}</th>
                                    <th>${escapeHtml(safeT('frequency'))}</th>
                                    <th>${escapeHtml(safeT('nextCharge'))}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${subscriptionRows}
                            </tbody>
                        </table>
                    ` : `<div class="muted">${escapeHtml(safeT('noSubscriptions'))}</div>`}
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('forecastSection'))}</div>
                    ${forecastRows ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>${escapeHtml(safeT('date'))}</th>
                                    <th>${escapeHtml(safeT('subscriptionsTotal'))}</th>
                                    <th>${escapeHtml(safeT('installmentsTotal'))}</th>
                                    <th>${escapeHtml(safeT('forecastTotal'))}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${forecastRows}
                            </tbody>
                        </table>
                    ` : `<div class="muted">${escapeHtml(safeT('noUpcomingCosts'))}</div>`}
                </div>

                <div class="section">
                    <div class="section-title">${escapeHtml(safeT('detailedList'))}</div>
                    ${detailedRows ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>${escapeHtml(safeT('date'))}</th>
                                    <th>${escapeHtml(safeT('description'))}</th>
                                    <th>${escapeHtml(safeT('category'))}</th>
                                    <th>${escapeHtml(safeT('amount'))}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detailedRows}
                            </tbody>
                        </table>
                    ` : `<div class="muted">${escapeHtml(safeT('noExpenses'))}</div>`}
                </div>
            </body>
        </html>
    `;
}
