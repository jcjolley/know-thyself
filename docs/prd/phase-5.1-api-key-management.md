# Phase 5.1: User API Key Management

## Overview

Enable users to input and manage their own Anthropic API key through a settings UI. Store the key securely using Electron's `safeStorage` API (OS keychain) and support first-launch onboarding when no key is configured.

## Problem Statement

Currently, the app requires `ANTHROPIC_API_KEY` to be set via a `.env` file. This works for development but fails for distributed builds because:
- `.env` files are not included in packaged apps
- End users shouldn't need to create configuration files
- API keys should be stored securely, not in plain text

Users need a way to:
1. Enter their API key on first launch
2. Update or clear the key via settings
3. Have the key stored securely using OS-native encryption

## Goals

- [ ] Provide secure storage for API keys using Electron's `safeStorage` API
- [ ] Show API key setup screen on first launch when no key is configured
- [ ] Allow users to update/clear their key from settings
- [ ] Fall back to environment variable for development workflow
- [ ] Validate API key format before saving

## Non-Goals

- Not implementing OAuth or account-based authentication
- Not storing multiple API keys or key rotation
- Not adding usage tracking or billing alerts
- Not changing the Claude client initialization beyond key source
- Not adding a full settings page (only API key management for now)

---

## User Stories

### US-001: First-Launch API Key Entry
**As a** new user launching the app for the first time
**I want** to be prompted to enter my API key
**So that** I can start using the app without technical configuration

**Acceptance Criteria:**
- [ ] Given no API key is stored and no env var is set, when app launches, then show API key setup screen
- [ ] Given setup screen is shown, when user enters valid key and clicks Save, then key is stored securely
- [ ] Given key is saved, when user clicks Continue, then they see the main chat interface
- [ ] Given setup screen is shown, when user enters invalid format key, then show validation error
- [ ] Setup screen shows link to Anthropic console for getting API key

### US-002: API Key Validation
**As a** user entering my API key
**I want** immediate feedback if my key format is wrong
**So that** I don't waste time with typos

**Acceptance Criteria:**
- [ ] Given user enters key not starting with `sk-ant-`, when they try to save, then show format error
- [ ] Given user enters key shorter than 40 characters, when they try to save, then show format error
- [ ] Given user enters valid format key, when they save, then no validation error is shown
- [ ] Validation happens on blur and on submit

### US-003: Settings Access
**As a** user with a configured API key
**I want** to access API key settings from the main interface
**So that** I can update or remove my key if needed

**Acceptance Criteria:**
- [ ] Given main chat view, when user clicks settings icon, then settings panel opens
- [ ] Given settings panel, user can see masked API key (showing only last 4 chars)
- [ ] Given settings panel, user can click "Update Key" to enter a new key
- [ ] Given settings panel, user can click "Remove Key" to clear stored key
- [ ] After removing key, app shows setup screen on next action requiring Claude

### US-004: Secure Storage
**As a** security-conscious user
**I want** my API key stored using OS-native encryption
**So that** it's protected even if someone accesses my filesystem

**Acceptance Criteria:**
- [ ] Given user saves API key, when stored, then it uses Electron's safeStorage.encryptString()
- [ ] Given encrypted key file exists, when app starts, then it's decrypted with safeStorage.decryptString()
- [ ] Encrypted key file is stored in app's userData directory
- [ ] Plain text key is never written to disk

### US-005: Development Fallback
**As a** developer
**I want** the `.env` file to still work
**So that** I can develop without UI interaction

**Acceptance Criteria:**
- [ ] Given `ANTHROPIC_API_KEY` env var is set, when app starts, then use env var (skip stored key check)
- [ ] Given env var is set, when opening settings, then show "Using environment variable" status
- [ ] Given env var is set, when in settings, then "Update Key" is disabled with explanation

---

## Phases

### Phase 1: Secure Storage Module

Create the core API key storage functionality using Electron's safeStorage.

#### 1.1 Create API Key Storage Module
**File:** `src/main/api-key-storage.ts`

```typescript
import { safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';

const KEY_FILE = 'api-key.enc';

export interface ApiKeyStatus {
    hasKey: boolean;
    source: 'stored' | 'env' | 'none';
    maskedKey: string | null;  // e.g., "••••••••abcd"
}

// Check if API key is available from any source
export function getApiKeyStatus(): ApiKeyStatus;

// Get the actual API key (for internal use only)
export function getApiKey(): string | null;

// Save API key securely
export function saveApiKey(key: string): { success: boolean; error?: string };

// Remove stored API key
export function clearApiKey(): boolean;

// Validate API key format
export function validateApiKeyFormat(key: string): { valid: boolean; error?: string };
```

#### 1.2 Implement Storage Functions
**File:** `src/main/api-key-storage.ts`

Key implementation details:
- Use `app.getPath('userData')` for storage location
- Check `safeStorage.isEncryptionAvailable()` before encrypting
- Fall back to warning if encryption unavailable (Linux without keyring)
- Validate key format: must start with `sk-ant-` and be 40+ chars

```typescript
export function saveApiKey(key: string): { success: boolean; error?: string } {
    const validation = validateApiKeyFormat(key);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const keyPath = path.join(app.getPath('userData'), KEY_FILE);

    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('Encryption not available - key will be stored with reduced security');
        // Still store but warn user in UI
    }

    try {
        const encrypted = safeStorage.encryptString(key);
        fs.writeFileSync(keyPath, encrypted);
        return { success: true };
    } catch (error) {
        return { success: false, error: `Failed to save key: ${error}` };
    }
}

export function validateApiKeyFormat(key: string): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
        return { valid: false, error: 'API key is required' };
    }
    if (!key.startsWith('sk-ant-')) {
        return { valid: false, error: 'API key must start with sk-ant-' };
    }
    if (key.length < 40) {
        return { valid: false, error: 'API key appears too short' };
    }
    return { valid: true };
}
```

### Phase 2: IPC Handlers

Add IPC channels for renderer to interact with API key storage.

#### 2.1 Register API Key IPC Handlers
**File:** `src/main/ipc.ts`

Add new handlers in the `registerIPCHandlers` function:

```typescript
// ==========================================================================
// API Key Management
// ==========================================================================

ipcMain.handle('apiKey:getStatus', async (): Promise<ApiKeyStatus> => {
    return getApiKeyStatus();
});

ipcMain.handle('apiKey:save', async (_event, key: string): Promise<{ success: boolean; error?: string }> => {
    const result = saveApiKey(key);
    if (result.success) {
        // Re-initialize Claude with new key
        try {
            initClaude();
        } catch (error) {
            return { success: false, error: `Key saved but Claude init failed: ${error}` };
        }
    }
    return result;
});

ipcMain.handle('apiKey:clear', async (): Promise<boolean> => {
    return clearApiKey();
});

ipcMain.handle('apiKey:validate', async (_event, key: string): Promise<{ valid: boolean; error?: string }> => {
    return validateApiKeyFormat(key);
});
```

#### 2.2 Update Claude Initialization
**File:** `src/main/claude.ts`

Modify `initClaude()` to check stored key first:

```typescript
import { getApiKey } from './api-key-storage.js';

export function initClaude(): void {
    if (isMockEnabled()) {
        mockMode = true;
        console.log('Claude client initialized in MOCK mode');
        return;
    }

    // Priority: env var > stored key
    const apiKey = process.env.ANTHROPIC_API_KEY || getApiKey();

    if (!apiKey) {
        // Don't throw - let UI handle missing key
        console.log('No API key configured - waiting for user input');
        return;
    }

    client = new Anthropic({ apiKey });
    console.log('Claude client initialized');
}
```

### Phase 3: Preload Bridge

Expose API key functions to renderer.

#### 3.1 Update Preload Script
**File:** `src/preload/index.ts`

Add to the ElectronAPI interface and implementation:

```typescript
interface ApiKeyStatus {
    hasKey: boolean;
    source: 'stored' | 'env' | 'none';
    maskedKey: string | null;
}

interface ElectronAPI {
    // ... existing ...
    apiKey: {
        getStatus: () => Promise<ApiKeyStatus>;
        save: (key: string) => Promise<{ success: boolean; error?: string }>;
        clear: () => Promise<boolean>;
        validate: (key: string) => Promise<{ valid: boolean; error?: string }>;
    };
}

// In the api object:
apiKey: {
    getStatus: () => ipcRenderer.invoke('apiKey:getStatus'),
    save: (key: string) => ipcRenderer.invoke('apiKey:save', key),
    clear: () => ipcRenderer.invoke('apiKey:clear'),
    validate: (key: string) => ipcRenderer.invoke('apiKey:validate', key),
},
```

### Phase 4: Setup Screen UI

Create the first-launch API key setup screen.

#### 4.1 Create API Key Setup Component
**File:** `src/renderer/components/ApiKeySetup.tsx`

```typescript
interface ApiKeySetupProps {
    onComplete: () => void;
}

export function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Validate on blur
    // Save on submit
    // Show link to console.anthropic.com
}
```

Key UI elements:
- Title: "Welcome to Know Thyself"
- Subtitle: "Enter your Anthropic API key to get started"
- Password input field (masked by default, toggle to show)
- Validation error display
- "Get API Key" link to https://console.anthropic.com/
- Save button
- Help text about key security

#### 4.2 Create Settings Panel Component
**File:** `src/renderer/components/SettingsPanel.tsx`

```typescript
interface SettingsPanelProps {
    onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
    const [status, setStatus] = useState<ApiKeyStatus | null>(null);
    const [editing, setEditing] = useState(false);

    // Show current key status
    // Update/Remove buttons
    // Re-use ApiKeySetup for editing
}
```

### Phase 5: App Integration

Wire up the setup screen and settings into the main app flow.

#### 5.1 Update App Component
**File:** `src/renderer/App.tsx`

Add state to track API key status and show setup screen when needed:

```typescript
function App() {
    const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        window.api.apiKey.getStatus().then(setApiKeyStatus);
    }, []);

    // Show setup screen if no key
    if (apiKeyStatus && !apiKeyStatus.hasKey) {
        return <ApiKeySetup onComplete={() => {
            window.api.apiKey.getStatus().then(setApiKeyStatus);
        }} />;
    }

    // Normal app with settings button
    return (
        <div>
            {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
            {/* existing app content */}
        </div>
    );
}
```

#### 5.2 Add Settings Button to Header
**File:** `src/renderer/components/ChatHeader.tsx` (or appropriate location)

Add a gear icon button that opens settings panel.

### Phase 6: Testing

#### 6.1 API Key Storage Tests
**File:** `tests/api-key-storage.spec.ts`

Test the storage module functionality:
- Saving and loading keys
- Validation rules
- Clearing keys
- Status reporting

#### 6.2 Setup Flow Integration Test
**File:** `tests/api-key-setup.spec.ts`

Test the full setup flow:
- First launch shows setup screen
- Entering valid key enables app
- Settings panel works correctly

---

## Technical Specifications

### Data Storage

**Location:** `{userData}/api-key.enc`
- macOS: `~/Library/Application Support/know-thyself/api-key.enc`
- Windows: `%APPDATA%/know-thyself/api-key.enc`
- Linux: `~/.config/know-thyself/api-key.enc`

**Encryption:**
- Uses `safeStorage.encryptString()` which leverages:
  - macOS: Keychain
  - Windows: DPAPI
  - Linux: libsecret (if available)

### API Key Priority

1. Environment variable `ANTHROPIC_API_KEY` (highest - for development)
2. Stored encrypted key
3. None (show setup screen)

### Validation Rules

| Rule | Validation |
|------|------------|
| Required | Key cannot be empty |
| Prefix | Must start with `sk-ant-` |
| Length | Must be >= 40 characters |

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/api-key-storage.ts` | Secure key storage module |
| `src/renderer/components/ApiKeySetup.tsx` | First-launch setup screen |
| `src/renderer/components/SettingsPanel.tsx` | Settings panel with key management |
| `tests/api-key-storage.spec.ts` | Storage module tests |
| `tests/api-key-setup.spec.ts` | Setup flow integration tests |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/ipc.ts` | Add apiKey IPC handlers |
| `src/main/claude.ts` | Use getApiKey() for initialization |
| `src/main/index.ts` | Handle missing key gracefully |
| `src/preload/index.ts` | Expose apiKey bridge functions |
| `src/shared/types.ts` | Add ApiKeyStatus type |
| `src/renderer/App.tsx` | Add setup screen conditional, settings state |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass
- `make build` - Build succeeds (including packaged app)

### Post-Verification: Code Simplification

After all quality gates pass:
1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates
3. Repeat until no further simplifications

---

## Verification Checklist

1. [ ] Fresh install (no userData) shows API key setup screen
2. [ ] Entering invalid key format shows validation error
3. [ ] Entering valid key and saving works, shows main app
4. [ ] Settings panel shows masked key (e.g., "••••••••abcd")
5. [ ] "Update Key" in settings allows entering new key
6. [ ] "Remove Key" clears stored key, shows setup on next Claude action
7. [ ] With `ANTHROPIC_API_KEY` env var set, app uses it (skips setup)
8. [ ] With env var set, settings shows "Using environment variable"
9. [ ] Packaged app (make build) works with user-entered key
10. [ ] Key file is encrypted (not readable as plain text)

---

## Implementation Order

1. Create `src/main/api-key-storage.ts` with all storage functions
2. Add ApiKeyStatus type to `src/shared/types.ts`
3. Add IPC handlers to `src/main/ipc.ts`
4. Update `src/main/claude.ts` to use getApiKey()
5. Update `src/main/index.ts` to handle missing key gracefully
6. Update `src/preload/index.ts` with apiKey bridge
7. Create `src/renderer/components/ApiKeySetup.tsx`
8. Create `src/renderer/components/SettingsPanel.tsx`
9. Update `src/renderer/App.tsx` with setup flow
10. Add settings button to header
11. Write tests
12. Run `make check` and fix issues
13. Test packaged build with `make build`
14. Run code simplifier and re-verify

---

## Open Questions

- [x] Should we test the key by making a small API call before accepting it?
  - **Decision**: No - just validate format. Testing would require API calls that cost money and add complexity. Bad keys will fail on first chat.

- [x] What happens on Linux without libsecret?
  - **Decision**: safeStorage falls back to less secure storage. Show warning in UI but allow usage.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User loses API key | Medium | Show masked key in settings, link to Anthropic console |
| safeStorage unavailable on some Linux | Low | Fall back with warning, key still works |
| User confusion about env var vs stored | Low | Clear status message in settings panel |
| Key validation too strict | Low | Only check prefix and length, not actual API validity |
