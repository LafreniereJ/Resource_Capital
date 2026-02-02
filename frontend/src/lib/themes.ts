// ============================================
// Resource Capital Theme Definitions
// Mineral-Named Accent Colors
// ============================================

export type ThemeName = 'midnight' | 'emerald' | 'bullion' | 'prospector';

export interface Theme {
    name: ThemeName;
    label: string;
    description: string;
    accent: string;
    accentLight: string;
    accentMuted: string;
    gradientMid: string;
}

// Base palette (consistent across all themes)
export const BASE_COLORS = {
    // Backgrounds
    bgBase: '#0a0a0f',
    bgSurface: '#12121a',
    bgElevated: '#1a1a24',
    // Text
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b0',
    textMuted: '#6b6b7b',
    // Borders & Glass
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.15)',
    glassBase: 'rgba(18, 18, 26, 0.6)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
    // Semantic (consistent)
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    // Neutral glow
    glowNeutral: 'rgba(255, 255, 255, 0.05)',
};

export const themes: Record<ThemeName, Theme> = {
    midnight: {
        name: 'midnight',
        label: 'Midnight',
        description: 'Deep Blue',
        accent: '#2563eb',
        accentLight: '#3b82f6',
        accentMuted: 'rgba(37, 99, 235, 0.15)',
        gradientMid: '#22d3ee',
    },
    emerald: {
        name: 'emerald',
        label: 'Emerald',
        description: 'Vibrant Green',
        accent: '#10b981',
        accentLight: '#34d399',
        accentMuted: 'rgba(16, 185, 129, 0.15)',
        gradientMid: '#34d399',
    },
    bullion: {
        name: 'bullion',
        label: 'Bullion',
        description: 'Golden Luster',
        accent: '#ca8a04',
        accentLight: '#eab308',
        accentMuted: 'rgba(202, 138, 4, 0.15)',
        gradientMid: '#fde047',
    },
    prospector: {
        name: 'prospector',
        label: 'Prospector',
        description: 'Copper Ore',
        accent: '#b87333',
        accentLight: '#d2915a',
        accentMuted: 'rgba(184, 115, 51, 0.15)',
        gradientMid: '#fdba74',
    },
};

export const DEFAULT_THEME: ThemeName = 'midnight';

// Helper to get CSS variables from a theme
export function getThemeCSSVariables(theme: Theme): Record<string, string> {
    return {
        // Base colors (same for all themes)
        '--color-bg-base': BASE_COLORS.bgBase,
        '--color-bg-surface': BASE_COLORS.bgSurface,
        '--color-bg-elevated': BASE_COLORS.bgElevated,
        '--color-text-primary': BASE_COLORS.textPrimary,
        '--color-text-secondary': BASE_COLORS.textSecondary,
        '--color-text-muted': BASE_COLORS.textMuted,
        '--color-border': BASE_COLORS.border,
        '--color-border-hover': BASE_COLORS.borderHover,
        '--glass-base': BASE_COLORS.glassBase,
        '--glass-border': BASE_COLORS.glassBorder,
        '--color-success': BASE_COLORS.success,
        '--color-danger': BASE_COLORS.danger,
        '--color-warning': BASE_COLORS.warning,
        '--glow-neutral': BASE_COLORS.glowNeutral,
        // Theme-specific accents
        '--color-accent': theme.accent,
        '--color-accent-light': theme.accentLight,
        '--color-accent-muted': theme.accentMuted,
        '--color-gradient-mid': theme.gradientMid,
    };
}
