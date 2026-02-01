// ========================================
// CORES
// ========================================
export const colors = {
    // Primárias
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    primaryBg: 'rgba(99, 102, 241, 0.15)', // Para fundos transparentes

    // Secundárias
    secondary: '#EC4899',

    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Backgrounds
    background: '#F8F9FA',
    surface: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Textos
    text: '#1F2937',
    textLight: '#6B7280',
    textLighter: '#9CA3AF',
    textWhite: '#FFFFFF',
    textDisabled: '#D1D5DB',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Categorias (já existentes)
    categoryFood: '#EF4444',
    categoryTransport: '#3B82F6',
    categoryHousing: '#F59E0B',
    categoryEntertainment: '#8B5CF6',
    categoryHealth: '#10B981',
    categoryEducation: '#6366F1',
    categoryShopping: '#EC4899',
    categoryOther: '#6B7280',
};

// ========================================
// ESPAÇAMENTOS
// ========================================
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
};

// ========================================
// BORDAS ARREDONDADAS
// ========================================
export const borderRadius = {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 25,
    xxxl: 30,
    full: 9999, // Círculo perfeito
};

// ========================================
// TAMANHOS DE FONTE
// ========================================
export const fontSize = {
    xs: 11,
    sm: 12,
    md: 14,
    base: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    huge: 28,
    giant: 32,
    mega: 42,
    ultra: 48,
};

// ========================================
// FONT WEIGHTS
// ========================================
export const fontWeight = {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};

// ========================================
// SOMBRAS
// ========================================
export const shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    colored: {
        // Para botões coloridos (ex: botão +)
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
};

// ========================================
// TAMANHOS COMUNS
// ========================================
export const sizes = {
    // Botões
    buttonHeight: 48,
    buttonHeightSmall: 40,
    buttonHeightLarge: 56,

    // Inputs
    inputHeight: 48,

    // FAB (Floating Action Button)
    fabSize: 64,

    // Ícones
    iconSmall: 18,
    iconMedium: 24,
    iconLarge: 32,
    iconHuge: 48,

    // Header
    headerHeight: 60,
};

// ========================================
// ANIMAÇÕES (duração em ms)
// ========================================
export const animations = {
    fast: 150,
    normal: 300,
    slow: 500,
};

// ========================================
// HELPERS - Funções úteis
// ========================================

// Retorna padding uniforme
export const padding = (size) => ({
    padding: spacing[size] || size,
});

// Retorna padding vertical
export const paddingVertical = (size) => ({
    paddingVertical: spacing[size] || size,
});

// Retorna padding horizontal
export const paddingHorizontal = (size) => ({
    paddingHorizontal: spacing[size] || size,
});

// Retorna margin uniforme
export const margin = (size) => ({
    margin: spacing[size] || size,
});

// Retorna margin vertical
export const marginVertical = (size) => ({
    marginVertical: spacing[size] || size,
});

// Retorna margin horizontal
export const marginHorizontal = (size) => ({
    marginHorizontal: spacing[size] || size,
});