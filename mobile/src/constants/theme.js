export const colors = {
    primary: '#4F46E5',
    primaryLight: '#818CF8',
    primaryDark: '#3730A3',
    primaryBg: 'rgba(79, 70, 229, 0.12)',

    primaryGradientStart: '#6366F1',
    primaryGradientEnd: '#4F46E5',

    secondary: '#EC4899',

    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    background: '#F8F9FA',
    surface: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',

    text: '#1F2937',
    textLight: '#6B7280',
    textLighter: '#9CA3AF',
    textWhite: '#FFFFFF',
    textDisabled: '#D1D5DB',

    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    categoryFood: '#EF4444',
    categoryTransport: '#3B82F6',
    categoryHousing: '#F59E0B',
    categoryEntertainment: '#8B5CF6',
    categoryHealth: '#10B981',
    categoryEducation: '#6366F1',
    categoryShopping: '#EC4899',
    categoryOther: '#6B7280',
};

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

export const borderRadius = {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 25,
    xxxl: 30,
    full: 9999,
};

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

export const fontWeight = {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};

export const fontFamily = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
};

export const typography = {
    h1: { fontFamily: fontFamily.bold, fontSize: fontSize.xxxl },
    h2: { fontFamily: fontFamily.bold, fontSize: fontSize.xxl },
    h3: { fontFamily: fontFamily.semibold, fontSize: fontSize.xl },
    body: { fontFamily: fontFamily.regular, fontSize: fontSize.base },
    bodyMedium: { fontFamily: fontFamily.medium, fontSize: fontSize.base },
    bodySemibold: { fontFamily: fontFamily.semibold, fontSize: fontSize.base },
    caption: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
    captionMedium: { fontFamily: fontFamily.medium, fontSize: fontSize.sm },
    label: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
};

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
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
};

export const sizes = {
    buttonHeight: 48,
    buttonHeightSmall: 40,
    buttonHeightLarge: 56,
    inputHeight: 48,
    fabSize: 64,
    iconSmall: 18,
    iconMedium: 24,
    iconLarge: 32,
    iconHuge: 48,
    headerHeight: 60,
};

export const animations = {
    fast: 150,
    normal: 300,
    slow: 500,
};

export const darkColors = {
    primary: '#818CF8',
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',
    primaryBg: 'rgba(129, 140, 248, 0.15)',

    primaryGradientStart: '#818CF8',
    primaryGradientEnd: '#6366F1',

    secondary: '#F472B6',

    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',

    background: '#0F172A',
    surface: '#1E293B',
    overlay: 'rgba(0, 0, 0, 0.7)',

    text: '#F1F5F9',
    textLight: '#CBD5E1',
    textLighter: '#94A3B8',
    textWhite: '#FFFFFF',
    textDisabled: '#475569',

    border: '#334155',
    borderLight: '#1E293B',

    categoryFood: '#EF4444',
    categoryTransport: '#3B82F6',
    categoryHousing: '#F59E0B',
    categoryEntertainment: '#A78BFA',
    categoryHealth: '#10B981',
    categoryEducation: '#818CF8',
    categoryShopping: '#EC4899',
    categoryOther: '#6B7280',
};
