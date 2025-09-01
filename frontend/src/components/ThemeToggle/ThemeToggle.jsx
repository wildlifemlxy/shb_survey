import React, { useState, useEffect } from 'react';
import '../../css/components/ThemeToggle/ThemeToggle.css';

// Theme utilities
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

const THEME_STORAGE_KEY = 'shb-survey-theme-preference';

const ThemeToggle = ({ className = '', showLabel = true, size = 'medium' }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.AUTO;
    }
    return THEMES.AUTO;
  });

  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    if (theme === THEMES.AUTO) {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
      }
      return THEMES.LIGHT;
    }
    return theme;
  });

  // Apply theme to document
  const applyTheme = (newTheme) => {
    if (typeof document === 'undefined') return;

    const effective = newTheme === THEMES.AUTO 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT)
      : newTheme;
    
    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add new theme class
    document.documentElement.classList.add(effective);
    
    // Also set data-theme attribute
    document.documentElement.setAttribute('data-theme', effective);
    
    // Store the preference
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }

    setEffectiveTheme(effective);
  };

  // Handle theme change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(theme);

    // Listen for system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = () => {
        if (theme === THEMES.AUTO) {
          applyTheme(THEMES.AUTO);
        }
      };
      
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.addListener(handleSystemThemeChange);
        return () => mediaQuery.removeListener(handleSystemThemeChange);
      }
    }
  }, [theme]);

  // Quick toggle between light/dark (ignoring auto)
  const quickToggle = () => {
    const newTheme = effectiveTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    handleThemeChange(newTheme);
  };

  const getThemeIcon = (themeType) => {
    switch (themeType) {
      case THEMES.LIGHT:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        );
      case THEMES.DARK:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        );
      case THEMES.AUTO:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <></>
  );
};

export default ThemeToggle;
