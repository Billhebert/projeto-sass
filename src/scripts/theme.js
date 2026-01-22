/**
 * Dark Mode Theme Switcher
 * Manages light and dark theme switching with localStorage persistence
 */

const themeModule = (() => {
  const THEME_KEY = 'appTheme';
  const THEMES = {
    light: 'light',
    dark: 'dark',
    auto: 'auto'
  };

  // Get saved theme preference
  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || THEMES.auto;
  }

  // Get actual theme (resolves 'auto' to actual theme)
  function getActualTheme() {
    const saved = getSavedTheme();
    
    if (saved === THEMES.auto) {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEMES.dark;
      }
      return THEMES.light;
    }
    
    return saved;
  }

  // Apply theme to document
  function applyTheme(theme) {
    const root = document.documentElement;
    const actual = theme === THEMES.auto ? getActualTheme() : theme;
    
    root.setAttribute('data-theme', actual);
    
    if (actual === THEMES.dark) {
      root.style.colorScheme = 'dark';
      applyDarkTheme();
    } else {
      root.style.colorScheme = 'light';
      applyLightTheme();
    }
  }

  // Apply light theme colors
  function applyLightTheme() {
    const colors = {
      '--primary': '#5D4DB3',
      '--primary-dark': '#4a3a8a',
      '--frete': '#2F9BD6',
      '--tarifa': '#F4C85A',
      '--margem': '#33A37A',
      '--imposto': '#EE7F66',
      '--custo': '#E08B7C',
      '--bg': '#f5f5f5',
      '--card': '#ffffff',
      '--muted': '#999999',
      '--muted-2': '#e0e0e0',
      '--text-dark': '#333333',
      '--text-light': '#666666',
      '--shadow': '0 1px 3px rgba(0, 0, 0, 0.08)'
    };
    
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }

  // Apply dark theme colors
  function applyDarkTheme() {
    const colors = {
      '--primary': '#7B68C7',
      '--primary-dark': '#6455a8',
      '--frete': '#3FA9E8',
      '--tarifa': '#F7D34F',
      '--margem': '#42B68D',
      '--imposto': '#F59480',
      '--custo': '#E89B8C',
      '--bg': '#1a1a1a',
      '--card': '#2d2d2d',
      '--muted': '#888888',
      '--muted-2': '#404040',
      '--text-dark': '#f0f0f0',
      '--text-light': '#b0b0b0',
      '--shadow': '0 1px 3px rgba(0, 0, 0, 0.3)'
    };
    
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }

  // Set theme
  function setTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return false;
    }
    
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    
    // Notify theme change listeners
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    
    return true;
  }

  // Initialize theme
  function init() {
    const saved = getSavedTheme();
    applyTheme(saved);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', (e) => {
        if (getSavedTheme() === THEMES.auto) {
          applyTheme(THEMES.auto);
        }
      });
    }
  }

  // Toggle theme (light <-> dark)
  function toggleTheme() {
    const current = getActualTheme();
    const newTheme = current === THEMES.dark ? THEMES.light : THEMES.dark;
    setTheme(newTheme);
    return newTheme;
  }

  // Create theme switcher UI
  function createThemeSwitcher(parentSelector) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return null;

    const container = document.createElement('div');
    container.className = 'theme-switcher';
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <select id="themeSelect" style="
          padding: 6px 10px;
          border: 1px solid var(--muted-2);
          border-radius: 4px;
          background: var(--card);
          color: var(--text-dark);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
          <option value="auto">🔄 Auto</option>
        </select>
        <button id="themeTrigger" style="
          padding: 6px 10px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        " title="Toggle theme">
          🌓
        </button>
      </div>
    `;

    parent.appendChild(container);

    // Setup event listeners
    const select = container.querySelector('#themeSelect');
    const toggle = container.querySelector('#themeTrigger');

    select.value = getSavedTheme();
    
    select.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });

    toggle.addEventListener('click', () => {
      const newTheme = toggleTheme();
      select.value = newTheme;
    });

    // Update select when theme changes externally
    window.addEventListener('themechange', (e) => {
      select.value = getSavedTheme();
    });

    return container;
  }

  return {
    init,
    setTheme,
    getTheme: getSavedTheme,
    getActualTheme,
    toggleTheme,
    createThemeSwitcher,
    THEMES
  };
})();

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  themeModule.init();
});
