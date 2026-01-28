/**
 * Typography constants for Poppins font family
 * Used throughout the app for consistent typography
 */

// Font family names as they will be loaded by expo-google-fonts
export const FONTS = {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
};

// Map fontWeight values to actual font families
// Use this when you have fontWeight in existing styles
export const getFontFamily = (weight) => {
    switch (weight) {
        case '700':
        case '800':
        case 'bold':
            return FONTS.bold;
        case '600':
        case 'semibold':
            return FONTS.semiBold;
        case '500':
        case 'medium':
            return FONTS.medium;
        default:
            return FONTS.regular;
    }
};

// Common text styles
export const TEXT_STYLES = {
    // Headers
    h1: {
        fontFamily: FONTS.bold,
        fontSize: 32,
        lineHeight: 40,
    },
    h2: {
        fontFamily: FONTS.bold,
        fontSize: 24,
        lineHeight: 32,
    },
    h3: {
        fontFamily: FONTS.semiBold,
        fontSize: 20,
        lineHeight: 28,
    },
    // Body text
    body: {
        fontFamily: FONTS.regular,
        fontSize: 16,
        lineHeight: 24,
    },
    bodyMedium: {
        fontFamily: FONTS.medium,
        fontSize: 16,
        lineHeight: 24,
    },
    bodySemiBold: {
        fontFamily: FONTS.semiBold,
        fontSize: 16,
        lineHeight: 24,
    },
    // Small text
    caption: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        lineHeight: 16,
    },
    captionMedium: {
        fontFamily: FONTS.medium,
        fontSize: 12,
        lineHeight: 16,
    },
    // Labels
    label: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        lineHeight: 20,
    },
    labelBold: {
        fontFamily: FONTS.semiBold,
        fontSize: 14,
        lineHeight: 20,
    },
    // Numbers/Prices
    price: {
        fontFamily: FONTS.bold,
        fontSize: 48,
        lineHeight: 56,
    },
    priceSmall: {
        fontFamily: FONTS.bold,
        fontSize: 32,
        lineHeight: 40,
    },
};
