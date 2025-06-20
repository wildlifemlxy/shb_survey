/**
 * Theme Utility Functions for Dark/Light Mode Support
 * Provides utilities to manage theme switching for the Straw-headed Bulbul Survey Dashboard
 */

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// Storage key for persisting theme preference
const THEME_STORAGE_KEY = 'shb-survey-theme-preference';

/**
 * Get the current system theme preference
 * @returns {string} 'dark' or 'light'
 */
export const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
  }
  return THEMES.LIGHT; // Default fallback
};

/**
 * Get the stored theme preference
 * @returns {string} 'dark', 'light', or 'auto'
 */
export const getStoredTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.AUTO;
  }
  return THEMES.AUTO;
};

/**
 * Store the theme preference
 * @param {string} theme - 'dark', 'light', or 'auto'
 */
export const setStoredTheme = (theme) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
};

/**
 * Get the effective theme (resolves 'auto' to actual theme)
 * @returns {string} 'dark' or 'light'
 */
export const getEffectiveTheme = () => {
  const stored = getStoredTheme();
  if (stored === THEMES.AUTO) {
    return getSystemTheme();
  }
  return stored;
};

/**
 * Apply theme to document
 * @param {string} theme - 'dark', 'light', or 'auto'
 */
export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;

  const effectiveTheme = theme === THEMES.AUTO ? getSystemTheme() : theme;
  
  // Remove existing theme classes
  document.documentElement.classList.remove('light', 'dark');
  
  // Add new theme class
  document.documentElement.classList.add(effectiveTheme);
  
  // Also set data-theme attribute for CSS selector support
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  
  // Store the preference
  setStoredTheme(theme);
};

/**
 * Initialize theme on app startup
 */
export const initializeTheme = () => {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);
  
  // Listen for system theme changes if using auto theme
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      const currentStored = getStoredTheme();
      if (currentStored === THEMES.AUTO) {
        applyTheme(THEMES.AUTO); // Reapply to get new system theme
      }
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }
  
  return () => {}; // No cleanup needed
};

/**
 * Toggle between light and dark themes
 * @returns {string} The new theme
 */
export const toggleTheme = () => {
  const currentTheme = getEffectiveTheme();
  const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  applyTheme(newTheme);
  return newTheme;
};

/**
 * Check if current theme is dark
 * @returns {boolean}
 */
export const isDarkTheme = () => {
  return getEffectiveTheme() === THEMES.DARK;
};

/**
 * Check if current theme is light
 * @returns {boolean}
 */
export const isLightTheme = () => {
  return getEffectiveTheme() === THEMES.LIGHT;
};

/**
 * Get theme-aware color values
 * @param {object} colors - Object with 'light' and 'dark' properties
 * @returns {string} The appropriate color for current theme
 */
export const getThemeColor = (colors) => {
  const theme = getEffectiveTheme();
  return colors[theme] || colors.light || colors.dark;
};

/**
 * React hook for theme management (if using React)
 */
export const useTheme = () => {
  if (typeof window === 'undefined') {
    return {
      theme: THEMES.LIGHT,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      isLight: true
    };
  }

  const [theme, setThemeState] = React.useState(getStoredTheme());
  const [effectiveTheme, setEffectiveTheme] = React.useState(getEffectiveTheme());

  const setTheme = (newTheme) => {
    applyTheme(newTheme);
    setThemeState(newTheme);
    setEffectiveTheme(newTheme === THEMES.AUTO ? getSystemTheme() : newTheme);
  };

  const toggle = () => {
    const newTheme = toggleTheme();
    setThemeState(newTheme);
    setEffectiveTheme(newTheme);
    return newTheme;
  };

  React.useEffect(() => {
    const cleanup = initializeTheme();
    return cleanup;
  }, []);

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme: toggle,
    isDark: effectiveTheme === THEMES.DARK,
    isLight: effectiveTheme === THEMES.LIGHT,
    isAuto: theme === THEMES.AUTO
  };
};

// Export default for convenience
export default {
  THEMES,
  getSystemTheme,
  getStoredTheme,
  setStoredTheme,
  getEffectiveTheme,
  applyTheme,
  initializeTheme,
  toggleTheme,
  isDarkTheme,
  isLightTheme,
  getThemeColor,
  useTheme
};
