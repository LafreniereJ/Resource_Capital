'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, DEFAULT_THEME, getThemeCSSVariables, type ThemeName, type Theme } from '@/lib/themes';

interface ThemeContextType {
    theme: Theme;
    themeName: ThemeName;
    setTheme: (name: ThemeName) => void;
    availableThemes: typeof themes;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'resource-capital-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
        if (savedTheme && themes[savedTheme]) {
            setThemeName(savedTheme);
        }
        setMounted(true);
    }, []);

    // Apply theme CSS variables
    useEffect(() => {
        if (!mounted) return;

        const theme = themes[themeName];
        const cssVars = getThemeCSSVariables(theme);
        const root = document.documentElement;

        // Apply all CSS variables
        Object.entries(cssVars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Set data attribute for potential CSS selectors
        root.setAttribute('data-theme', themeName);

        // Save to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, themeName);
    }, [themeName, mounted]);

    const setTheme = (name: ThemeName) => {
        if (themes[name]) {
            setThemeName(name);
        }
    };

    const value: ThemeContextType = {
        theme: themes[themeName],
        themeName,
        setTheme,
        availableThemes: themes,
    };

    // Prevent flash of incorrect theme
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
