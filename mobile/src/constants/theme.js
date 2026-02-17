export const colors = {
    primary: '#0F766E',
    primaryLight: '#14B8A6',
    primaryDark: '#115E59',
    primaryBg: 'rgba(15, 118, 110, 0.12)',

    primaryGradientStart: '#14B8A6',
    primaryGradientEnd: '#0F766E',

    secondary: '#F97316',

    success: '#16A34A',
    error: '#DC2626',
    warning: '#D97706',
    info: '#0284C7',

    background: '#F5FAF8',
    surface: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',

    successBg: 'rgba(22, 163, 74, 0.14)',
    errorBg: 'rgba(220, 38, 38, 0.12)',
    warningBg: 'rgba(217, 119, 6, 0.14)',

    text: '#132A2B',
    textLight: '#5C6F70',
    textLighter: '#8A9A9B',
    textWhite: '#FFFFFF',
    textDisabled: '#B7C8C8',

    border: '#D8E4E3',
    borderLight: '#EAF1F0',

    categoryFood: '#EF4444',
    categoryTransport: '#0EA5E9',
    categoryHousing: '#F59E0B',
    categoryEntertainment: '#8B5CF6',
    categoryHealth: '#10B981',
    categoryEducation: '#14B8A6',
    categoryShopping: '#EC4899',
    categoryOther: '#64748B',
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
        shadowColor: '#0F766E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 6,
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
    primary: '#2DD4BF',
    primaryLight: '#5EEAD4',
    primaryDark: '#14B8A6',
    primaryBg: 'rgba(45, 212, 191, 0.2)',

    primaryGradientStart: '#134E4A',
    primaryGradientEnd: '#0F766E',

    secondary: '#FB923C',

    success: '#4ADE80',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#38BDF8',

    background: '#0D1F20',
    surface: '#15292A',
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',
    overlayDark: 'rgba(0, 0, 0, 0.8)',

    successBg: 'rgba(74, 222, 128, 0.18)',
    errorBg: 'rgba(248, 113, 113, 0.16)',
    warningBg: 'rgba(251, 191, 36, 0.18)',

    text: '#E7F3F2',
    textLight: '#B7CDCC',
    textLighter: '#89A6A5',
    textWhite: '#FFFFFF',
    textDisabled: '#4C6A6A',

    border: '#2B4546',
    borderLight: '#1A3435',

    categoryFood: '#EF4444',
    categoryTransport: '#38BDF8',
    categoryHousing: '#FBBF24',
    categoryEntertainment: '#C4B5FD',
    categoryHealth: '#34D399',
    categoryEducation: '#5EEAD4',
    categoryShopping: '#F9A8D4',
    categoryOther: '#94A3B8',
};
