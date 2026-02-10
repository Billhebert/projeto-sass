/**
 * Breakpoints padronizados para responsividade
 * Usar em todos os componentes para garantir consistência
 */

export const breakpoints = {
  mobile: "320px",
  mobileLarge: "480px",
  tablet: "768px",
  desktop: "1024px",
  desktopLarge: "1280px",
  desktopXL: "1536px",
};

// Media queries prontas para uso
export const mediaQueries = {
  mobile: `@media (max-width: 767px)`,
  tablet: `@media (min-width: 768px) and (max-width: 1023px)`,
  desktop: `@media (min-width: 1024px)`,
  desktopLarge: `@media (min-width: 1280px)`,

  // Utility queries
  upTo: {
    mobile: `@media (max-width: 479px)`,
    tablet: `@media (max-width: 767px)`,
    desktop: `@media (max-width: 1023px)`,
    desktopLarge: `@media (max-width: 1279px)`,
  },

  from: {
    mobile: `@media (min-width: 480px)`,
    tablet: `@media (min-width: 768px)`,
    desktop: `@media (min-width: 1024px)`,
    desktopLarge: `@media (min-width: 1280px)`,
    desktopXL: `@media (min-width: 1536px)`,
  },
};

// Hook para uso em JavaScript
export const useMediaQuery = (query) => {
  if (typeof window === "undefined") return false;

  const mediaQuery = window.matchMedia(query.replace("@media ", ""));
  return mediaQuery.matches;
};

export default { breakpoints, mediaQueries, useMediaQuery };
