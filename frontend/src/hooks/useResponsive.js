/**
 * useResponsive Hook
 * Hook para detectar breakpoints e responsividade
 */

import { useState, useEffect } from "react";

const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  desktopLarge: 1280,
  desktopXL: 1536,
};

export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowSize.width < breakpoints.tablet;
  const isTablet =
    windowSize.width >= breakpoints.tablet &&
    windowSize.width < breakpoints.desktop;
  const isDesktop = windowSize.width >= breakpoints.desktop;
  const isDesktopLarge = windowSize.width >= breakpoints.desktopLarge;
  const isDesktopXL = windowSize.width >= breakpoints.desktopXL;

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isDesktopLarge,
    isDesktopXL,
    breakpoint: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
  };
}

/**
 * useMediaQuery Hook
 * Hook para detectar media queries customizadas
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    function handleChange(event) {
      setMatches(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

export default useResponsive;
