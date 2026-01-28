// Brand Colors (shared between themes)
const BRAND_COLORS = {
    bcvGreen: '#02DF82',
    euroBlue: '#007AFF',
    parallelOrange: '#FF9500',
};

// Dark Theme Colors
export const DARK_COLORS = {
    ...BRAND_COLORS,

    // UI Colors
    background: '#1c1c1e',
    card: '#2c2c2e',
    textPrimary: '#FFFFFF',
    textSecondary: '#a1a1aa',

    // Glassmorphism & Effects
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',

    // Glow Effects (for indicators/tabs)
    glowGreen: 'rgba(2, 223, 130, 0.15)',
    glowBlue: 'rgba(0, 122, 255, 0.15)',
    glowOrange: 'rgba(255, 149, 0, 0.15)',

    // Dividers & Overlays
    divider: 'rgba(255, 255, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Status bar
    statusBarStyle: 'light',
};

// Light Theme Colors
export const LIGHT_COLORS = {
    ...BRAND_COLORS,

    // UI Colors
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#1C1C1E',
    textSecondary: '#6C6C70',

    // Glassmorphism & Effects
    glass: 'rgba(0, 0, 0, 0.03)',
    glassBorder: 'rgba(0, 0, 0, 0.08)',

    // Glow Effects (for indicators/tabs)
    glowGreen: 'rgba(2, 223, 130, 0.12)',
    glowBlue: 'rgba(0, 122, 255, 0.12)',
    glowOrange: 'rgba(255, 149, 0, 0.12)',

    // Dividers & Overlays
    divider: 'rgba(0, 0, 0, 0.06)',
    overlay: 'rgba(0, 0, 0, 0.3)',

    // Status bar
    statusBarStyle: 'dark',
};

// Legacy export for backward compatibility during migration
export const COLORS = DARK_COLORS;
