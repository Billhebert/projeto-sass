/**
 * Design Tokens - Sistema de Design Centralizado
 * Usar estes tokens em vez de valores hardcoded
 */

export const colors = {
  // Primary colors
  primary: {
    50: "#fff9e5",
    100: "#ffebb3",
    200: "#ffdd80",
    300: "#ffcf4d",
    400: "#ffc11a",
    500: "#ffe600", // Main brand color
    600: "#e6cf00",
    700: "#ccb800",
    800: "#b3a100",
    900: "#998a00",
  },

  // Neutral colors
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Semantic colors
  success: {
    light: "#d1fae5",
    main: "#10b981",
    dark: "#047857",
  },

  warning: {
    light: "#fed7aa",
    main: "#f59e0b",
    dark: "#d97706",
  },

  danger: {
    light: "#fee2e2",
    main: "#ef4444",
    dark: "#dc2626",
  },

  info: {
    light: "#dbeafe",
    main: "#3b82f6",
    dark: "#1d4ed8",
  },

  // UI colors
  background: {
    primary: "#ffffff",
    secondary: "#f9fafb",
    tertiary: "#f3f4f6",
    dark: "#1f2937",
  },

  text: {
    primary: "#111827",
    secondary: "#6b7280",
    tertiary: "#9ca3af",
    inverse: "#ffffff",
  },

  border: {
    light: "#e5e7eb",
    main: "#d1d5db",
    dark: "#9ca3af",
  },
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  },

  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
};

export const borderRadius = {
  none: "0",
  sm: "0.25rem", // 4px
  base: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  full: "9999px",
};

export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
};

export const transitions = {
  duration: {
    fast: "150ms",
    base: "200ms",
    slow: "300ms",
  },

  timing: {
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    spring: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
};

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

export const layout = {
  sidebar: {
    width: "260px",
    collapsedWidth: "72px",
  },

  header: {
    height: "64px",
  },

  container: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};

// Export all tokens as default
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  layout,
};
