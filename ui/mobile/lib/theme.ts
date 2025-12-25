/**
 * Design tokens for EverFreeNote mobile app
 * Converted from web OKLCH values to HEX for React Native compatibility
 * Source of truth: app/globals.css
 */

export const colors = {
  light: {
    // Backgrounds
    background: '#ffffff',           // oklch(100% 0 0)
    foreground: '#1f2937',           // oklch(20% 0.01 256) → gray-800

    // Cards and surfaces
    card: '#ffffff',                 // oklch(100% 0 0)
    cardForeground: '#1f2937',       // oklch(20% 0.01 256)

    // Primary - Emerald Green
    primary: '#16a34a',              // oklch(60% 0.18 145) → green-600
    primaryForeground: '#ffffff',    // oklch(100% 0 0)

    // Secondary
    secondary: '#f0fdf4',            // oklch(97% 0.01 145) → green-50
    secondaryForeground: '#166534',  // oklch(40% 0.05 145) → green-800

    // Muted
    muted: '#f3f4f6',                // oklch(97% 0.005 256) → gray-100
    mutedForeground: '#6b7280',      // oklch(55% 0.02 256) → gray-500

    // Accent
    accent: '#ecfdf5',               // oklch(96% 0.03 145) → emerald-50
    accentForeground: '#166534',     // oklch(40% 0.05 145) → green-800

    // Destructive
    destructive: '#dc2626',          // oklch(55% 0.22 29) → red-600
    destructiveForeground: '#ffffff',

    // Borders and inputs
    border: '#e5e7eb',               // oklch(90% 0.005 256) → gray-200
    input: '#e5e7eb',                // oklch(90% 0.005 256) → gray-200

    // Focus ring
    ring: '#22c55e',                 // oklch(55% 0.15 145) → green-500
  },

  dark: {
    // Backgrounds
    background: '#111827',           // oklch(20% 0.015 256) → gray-900
    foreground: '#f9fafb',           // oklch(95% 0.005 256) → gray-50

    // Cards and surfaces
    card: '#1f2937',                 // oklch(24% 0.015 256) → gray-800
    cardForeground: '#f9fafb',       // oklch(95% 0.005 256)

    // Primary - Brighter Emerald for dark mode
    primary: '#22c55e',              // oklch(65% 0.18 145) → green-500
    primaryForeground: '#052e16',    // oklch(15% 0.01 145) → green-950

    // Secondary
    secondary: '#374151',            // oklch(30% 0.02 256) → gray-700
    secondaryForeground: '#f9fafb',  // oklch(95% 0.005 256)

    // Muted
    muted: '#1f2937',                // oklch(28% 0.015 256) → gray-800
    mutedForeground: '#9ca3af',      // oklch(65% 0.01 256) → gray-400

    // Accent
    accent: '#14532d',               // oklch(32% 0.04 145) → green-900
    accentForeground: '#f9fafb',     // oklch(95% 0.005 256)

    // Destructive
    destructive: '#b91c1c',          // oklch(50% 0.2 29) → red-700
    destructiveForeground: '#ffffff',

    // Borders and inputs
    border: '#374151',               // oklch(32% 0.015 256) → gray-700
    input: '#374151',                // oklch(32% 0.015 256)

    // Focus ring
    ring: '#22c55e',                 // oklch(65% 0.18 145) → green-500
  },
} as const

// Typography settings matching web
export const typography = {
  fontFamily: {
    sans: 'Inter',
    mono: 'monospace',
  },
  lineHeight: {
    heading: 1.25,
    body: 1.75,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const

// Spacing scale (matching Tailwind's default)
export const spacing = {
  px: 1,
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const

// Border radius
export const radius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const

// Export a helper to get current theme colors
export type ColorScheme = 'light' | 'dark'
export type ThemeMode = ColorScheme | 'system'

export const getThemeColors = (scheme: ColorScheme) => colors[scheme]

// Default export for convenience
export default {
  colors,
  typography,
  spacing,
  radius,
}
