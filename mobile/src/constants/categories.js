export const CATEGORIES = [
    'Food',
    'Delivery',
    'Groceries',
    'Shopping',
    'Restaurants',
    'Transport',
    'Travel',
    'Entertainment',
    'Health',
    'Services',
    'General',
    'Utilities',
    'Cash',
    'Transfers',
    'Insurance',
    'Wealth',
    'Refund',
    'Cashback',
    'ChildAllowance',
    'Investment',
    'Loan',
    'Credit',
    'Savings',
    'Donation',
    'Salary',
    'Gift',
    'TopUps',
    'NetSales',
    'Interest',
    'Remittances',
];

export const CATEGORY_ICONS = {
    Food: 'fast-food',
    Delivery: 'bicycle',
    Groceries: 'cart',
    Shopping: 'bag-handle',
    Restaurants: 'restaurant',
    Transport: 'bus',
    Travel: 'airplane',
    Entertainment: 'game-controller',
    Health: 'medical',
    Services: 'construct',
    General: 'cash',
    Utilities: 'home',
    Cash: 'cash-outline',
    Transfers: 'swap-horizontal',
    Insurance: 'umbrella',
    Wealth: 'diamond',
    Refund: 'arrow-undo',
    Cashback: 'arrow-back-circle',
    ChildAllowance: 'gift',
    Investment: 'trending-up',
    Loan: 'card',
    Credit: 'card-outline',
    Savings: 'wallet',
    Donation: 'heart',
    Salary: 'cash',
    Gift: 'gift-outline',
    TopUps: 'phone-portrait',
    NetSales: 'pricetag',
    Interest: 'trending-up',
    Remittances: 'globe',
};

export const CATEGORY_COLORS = {
    Food: '#FF9800',
    Delivery: '#FF5722',
    Groceries: '#4CAF50',
    Shopping: '#E91E63',
    Restaurants: '#FF5722',
    Transport: '#9C27B0',
    Travel: '#2196F3',
    Entertainment: '#F44336',
    Health: '#00BCD4',
    Services: '#7E57C2',
    General: '#4CAF50',
    Utilities: '#9E9E9E',
    Cash: '#00BCD4',
    Transfers: '#5E72E4',
    Insurance: '#FFC107',
    Wealth: '#4CAF50',
    Refund: '#00BCD4',
    Cashback: '#FFEB3B',
    ChildAllowance: '#E91E63',
    Investment: '#7E57C2',
    Loan: '#00BCD4',
    Credit: '#00BCD4',
    Savings: '#FF9800',
    Donation: '#F44336',
    Salary: '#2196F3',
    Gift: '#9C27B0',
    TopUps: '#2196F3',
    NetSales: '#00BCD4',
    Interest: '#CDDC39',
    Remittances: '#7E57C2',
    Other: '#9E9E9E',
};

export function getCategoryIcon(category) {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS.General;
}

export function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

export const CATEGORY_MAP_PT_TO_EN = {
    'Lazer': 'Entertainment',
    'Alimentação': 'Groceries',
    'Transporte': 'Transport',
    'Outros': 'General',
    'Compras': 'Shopping',
    'Moradia': 'Utilities',
    'Saúde': 'Health',
    'Educação': 'Services',
    'Comida': 'Food',
};

export function normalizeCategory(category) {
    if (!category) return 'General';
    return CATEGORY_MAP_PT_TO_EN[category] || category;
}
