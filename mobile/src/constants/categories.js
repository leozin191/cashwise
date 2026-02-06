// Lista completa de categorias (Revolut style)
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

// Ícones Ionicons para cada categoria
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

// Cores para cada categoria (Revolut style)
export const CATEGORY_COLORS = {
    Food: '#FF9800',           // Laranja
    Delivery: '#FF5722',       // Laranja avermelhado
    Groceries: '#4CAF50',      // Verde
    Shopping: '#E91E63',       // Rosa
    Restaurants: '#FF5722',    // Laranja
    Transport: '#9C27B0',      // Roxo
    Travel: '#2196F3',         // Azul
    Entertainment: '#F44336',  // Vermelho
    Health: '#00BCD4',         // Ciano
    Services: '#7E57C2',       // Roxo claro
    General: '#4CAF50',        // Verde
    Utilities: '#9E9E9E',      // Cinza
    Cash: '#00BCD4',           // Ciano
    Transfers: '#5E72E4',      // Azul
    Insurance: '#FFC107',      // Amarelo
    Wealth: '#4CAF50',         // Verde
    Refund: '#00BCD4',         // Ciano
    Cashback: '#FFEB3B',       // Amarelo claro
    ChildAllowance: '#E91E63', // Rosa
    Investment: '#7E57C2',     // Roxo
    Loan: '#00BCD4',           // Ciano
    Credit: '#00BCD4',         // Ciano
    Savings: '#FF9800',        // Laranja
    Donation: '#F44336',       // Vermelho
    Salary: '#2196F3',         // Azul
    Gift: '#9C27B0',           // Roxo
    TopUps: '#2196F3',         // Azul
    NetSales: '#00BCD4',       // Ciano
    Interest: '#CDDC39',       // Verde limão
    Remittances: '#7E57C2',    // Roxo
    Other: '#9E9E9E',          // Cinza
};

// Emojis (backup se não quiser usar ícones)
export const CATEGORY_EMOJIS = {
    Food: '🍔',
    Delivery: '🛵',
    Groceries: '🛒',
    Shopping: '🛍️',
    Restaurants: '🍽️',
    Transport: '🚌',
    Travel: '✈️',
    Entertainment: '🎮',
    Health: '💊',
    Services: '🔧',
    General: '💰',
    Utilities: '🏠',
    Cash: '💵',
    Transfers: '↔️',
    Insurance: '☂️',
    Wealth: '💎',
    Refund: '🔄',
    Cashback: '💸',
    ChildAllowance: '👶',
    Investment: '📈',
    Loan: '💳',
    Credit: '💳',
    Savings: '🏦',
    Donation: '❤️',
    Salary: '💰',
    Gift: '🎁',
    TopUps: '📱',
    NetSales: '💰',
    Interest: '%',
    Remittances: '🌍',
    Other: '📌',
};

// Funções helper
export function getCategoryIcon(category) {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS.General;
}

export function getCategoryEmoji(category) {
    return CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS.Other;
}

export function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

// Mapeamento PT → EN (para backend)
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