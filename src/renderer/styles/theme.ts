export interface Theme {
  name: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceHover: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    border: string;
    success: string;
    error: string;
    shadow: string;
  };
}

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: '#faf8f5',
    surface: '#ffffff',
    surfaceHover: '#f5f2ed',
    textPrimary: '#3d3630',
    textSecondary: '#8b8178',
    textMuted: '#a09890',
    accent: '#c4956a',
    accentSoft: 'rgba(196, 149, 106, 0.12)',
    border: 'rgba(139, 129, 120, 0.15)',
    success: '#7d9e7a',
    error: '#c45a4a',
    shadow: 'rgba(61, 54, 48, 0.08)',
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: '#1a1714',
    surface: '#252220',
    surfaceHover: '#2f2b28',
    textPrimary: '#e8e4df',
    textSecondary: '#9a918a',
    textMuted: '#6b6359',
    accent: '#d4a574',
    accentSoft: 'rgba(212, 165, 116, 0.15)',
    border: 'rgba(139, 129, 120, 0.2)',
    success: '#8fb88a',
    error: '#d4756a',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};
