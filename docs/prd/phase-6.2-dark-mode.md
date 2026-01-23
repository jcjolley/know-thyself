# Dark Mode

## Overview
Add a dark mode theme to the app that maintains the warm, contemplative aesthetic while reducing eye strain in low-light environments.

## Problem Statement
Users reflecting in the evening or low-light environments experience eye strain from the bright warm-white backgrounds. A dark mode option would improve comfort while preserving the app's literary, introspective character.

## Goals
- [ ] Create a cohesive dark theme that feels warm and contemplative (not cold/clinical)
- [ ] Allow users to toggle between light and dark modes
- [ ] Respect system preference (`prefers-color-scheme`) as default
- [ ] Persist user preference across sessions

## Non-Goals
- Not creating additional themes beyond light/dark
- Not adding theme customization (custom colors)
- Not changing the Admin page (already has its own dark theme)
- Not modifying fonts or typography

## Constraints
- Must preserve the literary, serif-focused aesthetic
- Dark theme must feel warm (amber/sepia undertones), not cold (blue/gray)
- All existing functionality must work identically in both themes
- Theme switch must be instantaneous (no flash of wrong theme on load)

---

## User Stories

### US-001: Theme Toggle
**As a** user
**I want** to toggle between light and dark modes
**So that** I can choose the theme that suits my environment

**Acceptance Criteria:**
- [ ] Given user is on Settings panel, when they click the theme toggle, then the theme changes immediately
- [ ] Given user selects dark mode, when they navigate between tabs, then dark mode persists
- [ ] Given user closes and reopens the app, when app loads, then their theme preference is restored

### US-002: System Preference Detection
**As a** user who has set a system-wide dark mode preference
**I want** the app to respect my system preference by default
**So that** it matches my other applications automatically

**Acceptance Criteria:**
- [ ] Given user has never set a theme preference, when app loads with system dark mode, then app displays in dark mode
- [ ] Given user has never set a theme preference, when app loads with system light mode, then app displays in light mode
- [ ] Given user has manually set a theme, when system preference changes, then manual preference takes priority

### US-003: Dark Theme Visual Design
**As a** user in dark mode
**I want** the interface to feel warm and contemplative
**So that** the reflective experience remains consistent with the app's character

**Acceptance Criteria:**
- [ ] Given dark mode is active, when viewing any page, then background color is `#1a1714` (warm charcoal, not pure black `#000000`)
- [ ] Given dark mode is active, when viewing primary text, then text color is `#e8e4df` with contrast ratio >= 4.5:1 against background
- [ ] Given dark mode is active, when viewing accent elements, then accent color is `#d4a574` (lighter variant of brand tan)

*Note: US-003 criteria are visual design requirements verified through E2E tests, not unit tests.*

### US-004: Component Theme Support
**As a** user
**I want** all UI components to properly support dark mode
**So that** there are no visual inconsistencies

**Acceptance Criteria:**
- [ ] Given dark mode is active, when viewing ChatPage, then message bubbles have surface color `#252220` and text color `#e8e4df`
- [ ] Given dark mode is active, when viewing ProfileView, then cards have background `#252220` and text `#e8e4df`
- [ ] Given dark mode is active, when viewing ConversationSidebar, then sidebar background is `#1a1714`
- [ ] Given dark mode is active, when viewing TabNavigation, then nav background is `#1a1714` with accent `#d4a574`
- [ ] Given dark mode is active, when viewing JourneysPage, then all cards and text use dark theme colors

*Note: US-004 criteria are visual integration requirements verified through E2E tests, not unit tests.*

---

## Design Specification

### Color Palette

#### Light Theme (Current)
```
Background:     #faf8f5  (warm off-white)
Surface:        #ffffff  (white cards)
Text Primary:   #3d3630  (warm dark brown)
Text Secondary: #8b8178  (muted brown)
Text Muted:     #a09890  (light brown)
Accent:         #c4956a  (warm tan/bronze)
Accent Soft:    rgba(196, 149, 106, 0.12)
Border:         rgba(139, 129, 120, 0.15)
Success:        #7d9e7a  (sage green)
Error:          #c45a4a  (warm red)
```

#### Dark Theme (New)
```
Background:     #1a1714  (warm charcoal - NOT pure black)
Surface:        #252220  (elevated warm dark)
Surface Hover:  #2f2b28  (hover state)
Text Primary:   #e8e4df  (warm off-white)
Text Secondary: #9a918a  (muted warm gray)
Text Muted:     #6b6359  (dim warm gray)
Accent:         #d4a574  (lighter warm tan - better contrast on dark)
Accent Soft:    rgba(212, 165, 116, 0.15)
Border:         rgba(139, 129, 120, 0.2)
Success:        #8fb88a  (lighter sage)
Error:          #d4756a  (lighter warm red)
```

### Visual Characteristics
- **Warm undertones**: All grays have brown/amber undertones
- **Not pure black**: Background is warm charcoal (#1a1714), not #000000
- **Elevated surfaces**: Cards slightly lighter than background for depth
- **Accent adaptation**: Brand tan slightly brighter for dark backgrounds
- **Preserved shadows**: Use rgba with warm tones for shadows

---

## Phases

### Phase 1: Theme Infrastructure

#### 1.1 Create Theme Definition File
**File:** `src/renderer/styles/theme.ts`

```typescript
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
```

#### 1.2 Create Theme Context
**File:** `src/renderer/contexts/ThemeContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, lightTheme, darkTheme } from '../styles/theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

#### 1.3 Create Theme Provider
**File:** `src/renderer/contexts/ThemeContext.tsx` (continued)

```typescript
const STORAGE_KEY = 'know-thyself-theme';

type ThemeMode = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): { mode: ThemeMode; resolved: 'light' | 'dark' } {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
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
    localStorage.setItem(STORAGE_KEY, newMode);
    setResolved(newMode === 'system' ? getSystemTheme() : newMode);
  };

  const toggleTheme = () => {
    setTheme(resolved === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextValue = {
    theme: resolved === 'dark' ? darkTheme : lightTheme,
    isDark: resolved === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

### Phase 2: Core Component Updates

#### 2.1 Update App.tsx
**File:** `src/renderer/App.tsx`

- Wrap app with ThemeProvider
- Apply theme background to root container

#### 2.2 Update TabNavigation
**File:** `src/renderer/components/TabNavigation.tsx`

- Import useTheme hook
- Replace hard-coded colors with theme values
- Update hover states for dark mode

#### 2.3 Update ChatPage
**File:** `src/renderer/components/ChatPage.tsx`

- Replace cssVars object with theme context values
- Update MessageBubble styling
- Update input area styling
- Update scrollbar colors

#### 2.4 Update ConversationSidebar
**File:** `src/renderer/components/ConversationSidebar.tsx`

- Replace inline colors with theme values
- Update gradients for dark mode
- Update ConversationItem colors

### Phase 3: Secondary Component Updates

#### 3.1 Update ProfileView
**File:** `src/renderer/components/ProfileView.tsx`

- Replace cssVars with theme context
- Update card backgrounds and text colors

#### 3.2 Update JourneysPage
**File:** `src/renderer/components/JourneysPage.tsx`

- Import useTheme hook
- Replace hard-coded colors with theme values
- Update card backgrounds and text colors

#### 3.3 Update MarkdownRenderer
**File:** `src/renderer/components/MarkdownRenderer.tsx`

- Accept theme colors as prop or use context
- Update all style objects

#### 3.4 Update SettingsPanel
**File:** `src/renderer/components/SettingsPanel.tsx`

- Add theme toggle control (Light / Dark / System)
- Style the toggle to match current theme

### Phase 4: Testing

#### 4.1 Unit Tests
**File:** `tests/unit/theme.test.tsx`

Write unit tests for theme context and toggle logic.

#### 4.2 E2E Tests
**File:** `tests/dark-mode.spec.ts`

Write E2E tests verifying theme persistence and visual switching.

### Phase 5: Polish

#### 5.1 Prevent Flash of Wrong Theme
Ensure theme is applied before first render by:
- Reading localStorage synchronously in ThemeProvider
- Setting initial state correctly

#### 5.2 Update index.html
**File:** `src/renderer/index.html`

Add script to set initial background color before React loads to prevent flash.

---

## Technical Specifications

### State Management
- Theme preference stored in localStorage key: `know-thyself-theme`
- Values: `'light'` | `'dark'` | `'system'`
- Default: `'system'`

### System Preference Detection
```typescript
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

### Theme Application
Theme colors accessed via `useTheme()` hook returning `{ theme, isDark, toggleTheme, setTheme }`.

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/renderer/styles/theme.ts` | Theme definitions (light/dark palettes) |
| `src/renderer/contexts/ThemeContext.tsx` | Theme context and provider |
| `tests/unit/theme.test.tsx` | Unit tests for US-001, US-002 |
| `tests/dark-mode.spec.ts` | E2E test for complete flow |

### Files to Modify
| File | Changes |
|------|---------|
| `src/renderer/App.tsx` | Wrap with ThemeProvider, apply theme background |
| `src/renderer/components/TabNavigation.tsx` | Use theme context for colors |
| `src/renderer/components/ChatPage.tsx` | Use theme context for colors |
| `src/renderer/components/ConversationSidebar.tsx` | Use theme context for colors |
| `src/renderer/components/ConversationItem.tsx` | Use theme context for colors |
| `src/renderer/components/ProfileView.tsx` | Use theme context for colors |
| `src/renderer/components/JourneysPage.tsx` | Use theme context for colors |
| `src/renderer/components/MarkdownRenderer.tsx` | Use theme context for colors |
| `src/renderer/components/SettingsPanel.tsx` | Add theme toggle UI |
| `src/renderer/index.html` | Add anti-flash script |

---

## Test Plan

### Unit Tests
**File:** `tests/unit/theme.test.tsx`

```typescript
describe('US-001: Theme Toggle', () => {
  it('US-001: toggleTheme switches from light to dark', () => {
    // Render ThemeProvider, call toggleTheme, verify isDark becomes true
  });

  it('US-001: toggleTheme switches from dark to light', () => {
    // Start in dark mode, call toggleTheme, verify isDark becomes false
  });

  it('US-001: theme preference persists to localStorage', () => {
    // Call setTheme('dark'), verify localStorage.getItem('know-thyself-theme') === 'dark'
  });

  it('US-001: theme loads from localStorage on mount', () => {
    // Set localStorage to 'dark', render provider, verify isDark is true
  });
});

describe('US-002: System Preference Detection', () => {
  it('US-002: defaults to system preference when no stored preference', () => {
    // Clear localStorage, mock matchMedia to return dark, verify isDark is true
  });

  it('US-002: manual preference overrides system preference', () => {
    // Set localStorage to 'light', mock system dark, verify isDark is false
  });

  it('US-002: responds to system preference changes when set to system', () => {
    // Set mode to 'system', trigger matchMedia change event, verify theme updates
  });
});
```

*Note: US-003 and US-004 are visual integration requirements that cannot be meaningfully unit tested. They are covered by E2E tests below.*

### E2E Tests
**File:** `tests/dark-mode.spec.ts`

```typescript
test.describe('Phase 6.2: Dark Mode', () => {
  test('US-001: theme toggle changes colors immediately', async () => {
    // Open settings, click toggle
    // Verify background color changes to #1a1714 within 100ms
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    expect(bgColor).toBe('rgb(26, 23, 20)'); // #1a1714
  });

  test('US-001: theme persists across page navigation', async () => {
    // Enable dark mode in settings
    // Navigate to Chat tab, verify background is #1a1714
    // Navigate to Profile tab, verify background is #1a1714
    // Navigate to Journeys tab, verify background is #1a1714
  });

  test('US-001: theme persists after app restart', async () => {
    // Enable dark mode, close app
    // Reopen app, verify background is #1a1714 on first render
  });

  test('US-003: dark theme uses warm charcoal background', async () => {
    // Enable dark mode
    // Verify body background is #1a1714 (not #000000 or cold gray)
    // Verify text color is #e8e4df
    // Verify accent color is #d4a574
  });

  test('US-004: ChatPage uses dark theme colors', async () => {
    // Enable dark mode, navigate to Chat
    // Verify message bubbles have background #252220
    // Verify input area has background #252220
    // Verify text is #e8e4df
  });

  test('US-004: ProfileView uses dark theme colors', async () => {
    // Enable dark mode, navigate to Profile
    // Verify cards have background #252220
    // Verify text is #e8e4df
  });

  test('US-004: ConversationSidebar uses dark theme colors', async () => {
    // Enable dark mode
    // Verify sidebar background is #1a1714
    // Verify conversation items have hover state #2f2b28
  });

  test('US-004: TabNavigation uses dark theme colors', async () => {
    // Enable dark mode
    // Verify nav background is #1a1714
    // Verify active tab indicator is #d4a574
  });

  test('US-004: JourneysPage uses dark theme colors', async () => {
    // Enable dark mode, navigate to Journeys
    // Verify page background is #1a1714
    // Verify cards have background #252220
  });
});
```

---

## Quality Gates

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test:unit` - All unit tests pass
- `npm run test` - All E2E tests pass
- `npm run build` - Build succeeds
- WCAG AA contrast ratio (4.5:1) for all text

### Post-Verification: Code Simplification
After all quality gates pass:
1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above

---

## Verification Checklist

1. [ ] Given Settings panel open, when clicking theme toggle, then theme changes instantly (no delay)
2. [ ] Given dark mode active, when viewing ChatPage, then background is warm charcoal (#1a1714)
3. [ ] Given dark mode active, when viewing message text, then text is readable (#e8e4df)
4. [ ] Given dark mode active, when viewing accent elements, then accent color is visible (#d4a574)
5. [ ] Given dark mode active, when navigating to Profile tab, then Profile uses dark colors
6. [ ] Given dark mode active, when viewing sidebar, then sidebar uses dark colors
7. [ ] Given theme set to dark, when closing and reopening app, then dark mode is restored
8. [ ] Given theme set to "System", when system is dark mode, then app uses dark theme
9. [ ] Given app loads for first time, then no flash of wrong theme color

---

## Implementation Order

1. Create theme definition file with light/dark palettes
2. Create ThemeContext and ThemeProvider
3. **Write unit tests for US-001, US-002** (theme toggle and system preference logic)
4. Update App.tsx with ThemeProvider
5. Update TabNavigation with theme support
6. Update ChatPage with theme support
7. Update ConversationSidebar with theme support
8. Update ProfileView with theme support
9. Update JourneysPage with theme support
10. Update MarkdownRenderer with theme support
11. Add theme toggle to SettingsPanel
12. Add anti-flash script to index.html
13. **Write E2E tests for US-001, US-003, US-004** (theme persistence and visual verification)
14. Run quality gates and simplify

---

## Open Questions

- [x] Should we support "auto" mode that follows system? **Yes** - implement as "System" option
- [x] Should dark mode affect Admin page? **No** - Admin already has its own dark theme

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flash of wrong theme on load | Medium | Add synchronous localStorage read before React renders |
| Inconsistent colors across components | High | Create comprehensive theme object, update all components |
| Poor contrast in dark mode | High | Verify WCAG AA compliance for all text |
| Breaking existing styling | Medium | Thorough testing, keep light theme as exact current values |
