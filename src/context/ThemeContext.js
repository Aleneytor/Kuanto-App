import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';
import { FONTS } from '../constants/typography';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@app_theme_preference';

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themePreference, setThemePreference] = useState('system'); // 'light', 'dark', or 'system'
    const [isLoading, setIsLoading] = useState(true);

    // Load saved theme preference
    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
            if (saved) {
                setThemePreference(saved);
            }
            setIsLoading(false);
        });
    }, []);

    // Force Dark Mode always
    const isDark = true;

    // Always use Dark Colors
    const colors = DARK_COLORS;

    // Changes are ignored, app is always dark
    const setTheme = async (newTheme) => {
        // No-op or we could just log that theme is locked
    };

    // Fonts available throughout the app
    const fonts = FONTS;

    const value = useMemo(() => ({
        themePreference,
        setTheme,
        isDark,
        colors,
        fonts,  // Expose fonts through context
        isLoading,
    }), [themePreference, isDark, colors, isLoading]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
