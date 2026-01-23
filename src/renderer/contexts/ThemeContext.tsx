import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, lightTheme, darkTheme } from '../styles/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void; // Alias for setTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = 'know-thyself-theme';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): { mode: ThemeMode; resolved: 'light' | 'dark' } {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  const mode = stored || 'system';
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  return { mode, resolved };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialTheme().mode);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => getInitialTheme().resolved);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (mode === 'system') {
        setResolved(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
    setResolved(newMode === 'system' ? getSystemTheme() : newMode);
  };

  const toggleTheme = () => {
    setTheme(resolved === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextValue = {
    theme: resolved === 'dark' ? darkTheme : lightTheme,
    isDark: resolved === 'dark',
    mode,
    toggleTheme,
    setTheme,
    setMode: setTheme, // Alias for setTheme
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
