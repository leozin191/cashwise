// Cores das categorias
export const CATEGORY_COLORS = {
    Food: '#EF4444',
    Transport: '#3B82F6',
    Housing: '#F59E0B',
    Entertainment: '#8B5CF6',
    Health: '#10B981',
    Education: '#6366F1',
    Shopping: '#EC4899',
    Other: '#6B7280',
};

// Emojis das categorias
export const CATEGORY_EMOJIS = {
    Food: '🍕',
    Transport: '🚗',
    Housing: '🏠',
    Entertainment: '🎮',
    Health: '💊',
    Education: '📚',
    Shopping: '🛍️',
    Other: '💰',
};

// Lista de categorias
export const CATEGORIES = [
    'Food',
    'Transport',
    'Housing',
    'Entertainment',
    'Health',
    'Education',
    'Shopping',
    'Other',
];

// Função helper
export function getCategoryEmoji(category) {
    return CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS.Other;
}

export function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

// Mapeamento PT → EN (do backend pro app)
export const CATEGORY_MAP_PT_TO_EN = {
    'Lazer': 'Entertainment',
    'Food': 'Food',
    'Alimentação': 'Food',
    'Transporte': 'Transport',
    'Transport': 'Transport',
    'Outros': 'Other',
    'Other': 'Other',
    'Compras': 'Shopping',
    'Shopping': 'Shopping',
    'Moradia': 'Housing',
    'Housing': 'Housing',
    'Saúde': 'Health',
    'Health': 'Health',
    'Educação': 'Education',
    'Education': 'Education',
    'Entretenimento': 'Entertainment',
    'Entertainment': 'Entertainment',
};

// Função para normalizar categoria (sempre retorna nome em inglês)
export function normalizeCategory(category) {
    return CATEGORY_MAP_PT_TO_EN[category] || category || 'Other';
}