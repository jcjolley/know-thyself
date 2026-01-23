import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from '../../src/renderer/contexts/ThemeContext';

// Helper component to access theme context
function ThemeConsumer({ onTheme }: { onTheme: (value: ReturnType<typeof useTheme>) => void }) {
  const theme = useTheme();
  onTheme(theme);
  return <div data-testid="theme-display">{theme.isDark ? 'dark' : 'light'}</div>;
}

// Mock matchMedia
function createMatchMedia(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  return {
    matches,
    addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    },
    removeEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(handler);
      if (index > -1) listeners.splice(index, 1);
    },
    triggerChange: (newMatches: boolean) => {
      listeners.forEach((handler) =>
        handler({ matches: newMatches } as MediaQueryListEvent)
      );
    },
  };
}

describe('US-001: Theme Toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default to light system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => createMatchMedia(false)),
    });
  });

  it('US-001: toggleTheme switches from light to dark', () => {
    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.isDark).toBe(false);

    act(() => {
      themeValue?.toggleTheme();
    });

    expect(themeValue?.isDark).toBe(true);
  });

  it('US-001: toggleTheme switches from dark to light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.isDark).toBe(true);

    act(() => {
      themeValue?.toggleTheme();
    });

    expect(themeValue?.isDark).toBe(false);
  });

  it('US-001: theme preference persists to localStorage', () => {
    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    act(() => {
      themeValue?.setTheme('dark');
    });

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('US-001: theme loads from localStorage on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.isDark).toBe(true);
    expect(themeValue?.mode).toBe('dark');
  });

  it('US-001: setTheme updates mode correctly', () => {
    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    act(() => {
      themeValue?.setTheme('dark');
    });
    expect(themeValue?.mode).toBe('dark');
    expect(themeValue?.isDark).toBe(true);

    act(() => {
      themeValue?.setTheme('light');
    });
    expect(themeValue?.mode).toBe('light');
    expect(themeValue?.isDark).toBe(false);
  });

  it('US-001: setMode alias works same as setTheme', () => {
    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    act(() => {
      themeValue?.setMode('dark');
    });
    expect(themeValue?.mode).toBe('dark');
    expect(themeValue?.isDark).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});

describe('US-002: System Preference Detection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('US-002: defaults to system preference when no stored preference (dark)', () => {
    // Mock system dark preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => createMatchMedia(true)),
    });

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.isDark).toBe(true);
    expect(themeValue?.mode).toBe('system');
  });

  it('US-002: defaults to system preference when no stored preference (light)', () => {
    // Mock system light preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => createMatchMedia(false)),
    });

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.isDark).toBe(false);
    expect(themeValue?.mode).toBe('system');
  });

  it('US-002: manual preference overrides system preference', () => {
    // System prefers dark
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => createMatchMedia(true)),
    });
    // But user has set light
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.isDark).toBe(false);
    expect(themeValue?.mode).toBe('light');
  });

  it('US-002: responds to system preference changes when set to system', () => {
    const mockMatchMedia = createMatchMedia(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => mockMatchMedia),
    });

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    // Initially light (system preference)
    expect(themeValue?.isDark).toBe(false);
    expect(themeValue?.mode).toBe('system');

    // Simulate system preference change to dark
    act(() => {
      mockMatchMedia.triggerChange(true);
    });

    expect(themeValue?.isDark).toBe(true);
  });

  it('US-002: does not respond to system changes when manually set', () => {
    const mockMatchMedia = createMatchMedia(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => mockMatchMedia),
    });

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    // Manually set to light
    act(() => {
      themeValue?.setTheme('light');
    });
    expect(themeValue?.isDark).toBe(false);

    // Simulate system preference change to dark
    act(() => {
      mockMatchMedia.triggerChange(true);
    });

    // Should still be light because user manually set it
    expect(themeValue?.isDark).toBe(false);
  });
});

describe('Theme Context Error Handling', () => {
  it('throws error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThemeConsumer onTheme={() => {}} />);
    }).toThrow('useTheme must be used within ThemeProvider');

    consoleSpy.mockRestore();
  });
});

describe('Theme Values', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => createMatchMedia(false)),
    });
  });

  it('provides correct light theme colors', () => {
    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.theme.name).toBe('light');
    expect(themeValue?.theme.colors.background).toBe('#faf8f5');
    expect(themeValue?.theme.colors.textPrimary).toBe('#3d3630');
    expect(themeValue?.theme.colors.accent).toBe('#c4956a');
  });

  it('provides correct dark theme colors', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    let themeValue: ReturnType<typeof useTheme> | null = null;
    render(
      <ThemeProvider>
        <ThemeConsumer onTheme={(t) => (themeValue = t)} />
      </ThemeProvider>
    );

    expect(themeValue?.theme.name).toBe('dark');
    expect(themeValue?.theme.colors.background).toBe('#1a1714');
    expect(themeValue?.theme.colors.textPrimary).toBe('#e8e4df');
    expect(themeValue?.theme.colors.accent).toBe('#d4a574');
  });
});
