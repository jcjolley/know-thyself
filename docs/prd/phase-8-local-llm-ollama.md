# Phase 8: Local LLM Support via Ollama

## Overview
Enable users to run the app with a locally-hosted LLM via Ollama instead of the remote Claude API. Local mode is the default setting, allowing privacy-focused usage without sending data to external servers.

## Problem Statement
Currently, all conversations require an Anthropic API key and send data to Claude's servers. Users who want complete data privacy or who lack reliable internet access cannot use the app effectively. Supporting Ollama allows fully local operation.

## Goals
- [ ] Allow users to switch between Ollama (local) and Claude (remote) backends
- [ ] Make Ollama the default backend for new installations
- [ ] Maintain feature parity for core chat functionality across backends
- [ ] Provide clear feedback when Ollama is not running or misconfigured

## Non-Goals
- Not supporting other local LLM providers (LM Studio, llama.cpp server) in this phase
- Not implementing model fine-tuning or custom model training
- Not adding Ollama installation/management within the app

---

## User Stories

### US-001: Select LLM Backend
**As a** user
**I want** to choose between local (Ollama) and remote (Claude) LLM backends
**So that** I can control where my data is processed

**Acceptance Criteria:**
- [ ] Settings panel shows a "LLM Backend" dropdown with options: "Local (Ollama)" and "Remote (Claude)"
- [ ] Default selection is "Local (Ollama)" for new installations
- [ ] Selection persists across app restarts
- [ ] Changing backend takes effect immediately for new messages (mid-conversation switching supported)

### US-002: Configure Ollama Connection
**As a** user using local mode
**I want** to configure my Ollama connection settings
**So that** the app can connect to my Ollama instance

**Acceptance Criteria:**
- [ ] When Ollama backend is selected, show Ollama-specific settings
- [ ] Configurable base URL with default `http://localhost:11434`
- [ ] App auto-detects available models and uses first one by default
- [ ] Model picker dropdown allows overriding the auto-selected model
- [ ] "Test Connection" button that verifies Ollama is reachable
- [ ] If no models available, show: "No models found. Run `ollama pull llama3.2` to download a model."
- [ ] Settings are hidden when Claude backend is selected

### US-003: Ollama Connection Status
**As a** user
**I want** to see whether Ollama is running and accessible
**So that** I know if local mode will work before starting a conversation

**Acceptance Criteria:**
- [ ] Status indicator shows "Connected" (green) when Ollama responds
- [ ] Status indicator shows "Not Running" (red) when Ollama is unreachable
- [ ] Status indicator shows "Checking..." during connection test
- [ ] Error message displays specific connection error (e.g., "Connection refused")

### US-004: Chat with Local LLM
**As a** user with Ollama selected
**I want** to have conversations using my local LLM
**So that** my data stays on my machine

**Acceptance Criteria:**
- [ ] Messages are sent to Ollama API instead of Claude API
- [ ] Streaming responses work identically to Claude streaming
- [ ] System prompts are passed to Ollama correctly
- [ ] Conversation history is maintained in context
- [ ] Extraction gracefully handles malformed JSON responses (logs warning, skips extraction)

### US-005: Graceful Fallback on Error
**As a** user
**I want** clear error messages when my selected backend is unavailable
**So that** I can troubleshoot or switch backends

**Acceptance Criteria:**
- [ ] If Ollama is unreachable during chat, show inline error: "Ollama is not running. Start Ollama or switch to Claude in Settings."
- [ ] If no Ollama models available, show: "No models found. Run `ollama pull llama3.2` to download a model."
- [ ] If Claude API key is missing/invalid, show inline error: "Invalid API key. Check your key in Settings."
- [ ] Error messages include a "Open Settings" link
- [ ] Previous messages in conversation remain visible after error

### US-006: Backend Indicator in UI
**As a** user
**I want** to see which backend is currently active
**So that** I always know where my messages are being processed

**Acceptance Criteria:**
- [ ] Chat header shows a pill-shaped badge: icon + "Local" or "Claude"
- [ ] Badge uses home icon (🏠) for Ollama, cloud icon (☁️) for Claude
- [ ] Indicator is visible without opening settings
- [ ] Clicking indicator opens settings panel to AI Backend section

### US-007: Visual Model Selection
**As a** user with multiple Ollama models
**I want** to browse and select models visually
**So that** I can easily see what's available and choose appropriately

**Acceptance Criteria:**
- [ ] Models display as horizontal scrollable cards (not a dropdown)
- [ ] Each card shows: model name, parameter count, disk size
- [ ] Selected model has checkmark and accent border
- [ ] Clicking a model card selects it immediately
- [ ] Empty state shows helpful command to pull a model with copy button

### US-008: Automatic Connection Testing
**As a** user
**I want** the app to automatically check my backend connection
**So that** I don't have to manually test every time

**Acceptance Criteria:**
- [ ] Opening settings auto-tests the current backend connection
- [ ] Switching backends auto-tests the new backend
- [ ] Status shows "Checking..." during test with subtle animation
- [ ] On success: shows "Connected" with green indicator
- [ ] On failure: shows error with retry button and help text

---

## Phases

### Phase 1: LLM Provider Abstraction
Create a provider interface that both backends can implement, establishing the foundation for multi-backend support.

#### 1.1 Define Provider Interface
**File:** `src/main/llm/types.ts`

```typescript
export type BackendType = 'ollama' | 'claude';

export interface LLMConfig {
  backend: BackendType;
  // Ollama-specific
  ollamaBaseUrl?: string;
  ollamaModel?: string;  // Optional - auto-detected if not set
  // Claude-specific
  claudeApiKey?: string;
  claudeModel?: string;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  readonly name: BackendType;

  isConfigured(): boolean;
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  generateText(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<string>;

  streamText(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt?: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown>;
}

export interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
}
```

#### 1.2 Create Provider Manager
**File:** `src/main/llm/manager.ts`

```typescript
export class LLMManager {
  private provider: LLMProvider | null = null;
  private config: LLMConfig;

  async initialize(config: LLMConfig): Promise<void>;
  getProvider(): LLMProvider;
  getConfig(): LLMConfig;
  async switchBackend(backend: BackendType): Promise<void>;
}

// Singleton instance
export const llmManager: LLMManager;
```

### Phase 2: Ollama Provider Implementation
Implement the Ollama backend that communicates with the local Ollama API.

#### 2.1 Implement Ollama Provider
**File:** `src/main/llm/ollama.ts`

```typescript
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;

  constructor(baseUrl: string, model: string);

  isConfigured(): boolean;
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  // Fetch available models from Ollama
  static async listModels(baseUrl: string): Promise<OllamaModel[]>;

  generateText(...): Promise<string>;
  streamText(...): AsyncGenerator<string>;
}
```

Ollama API endpoints:
- `GET /api/tags` - List available models
- `POST /api/chat` - Chat completion with message history (streaming)

#### 2.2 Implement Claude Provider
**File:** `src/main/llm/claude.ts`

Wrap existing Anthropic SDK usage in the provider interface.

```typescript
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const;

  constructor(apiKey: string, model?: string);

  isConfigured(): boolean;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  generateText(...): Promise<string>;
  streamText(...): AsyncGenerator<string>;
}
```

### Phase 3: Configuration Storage
Persist backend selection and configuration.

#### 3.1 Extend Backend Storage
**File:** `src/main/llm/storage.ts`

```typescript
export interface StoredLLMConfig {
  backend: BackendType;
  ollamaBaseUrl: string;
  ollamaModel?: string;  // Optional - auto-detected if not set
  // Claude API key stored separately via existing api-key-storage.ts
}

export async function loadLLMConfig(): Promise<StoredLLMConfig>;
export async function saveLLMConfig(config: StoredLLMConfig): Promise<void>;
export function getDefaultConfig(): StoredLLMConfig;
```

Default config:
```typescript
{
  backend: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434'
  // ollamaModel omitted - auto-detect first available model
}
```

### Phase 4: IPC Integration
Add IPC channels for backend management.

#### 4.1 Add IPC Handlers
**File:** `src/main/ipc.ts` (modify)

New IPC channels:
- `llm:get-config` → Returns current LLMConfig
- `llm:set-config` → Updates and persists config
- `llm:test-connection` → Tests current backend connection
- `llm:list-ollama-models` → Returns available Ollama models
- `llm:get-status` → Returns backend status (connected/error)

#### 4.2 Update Preload
**File:** `src/preload/index.ts` (modify)

Expose new IPC methods:
```typescript
llm: {
  getConfig(): Promise<LLMConfig>;
  setConfig(config: Partial<LLMConfig>): Promise<void>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  listOllamaModels(baseUrl?: string): Promise<OllamaModel[]>;
  getStatus(): Promise<{ backend: BackendType; connected: boolean; error?: string }>;
}
```

### Phase 5: Refactor All LLM Calls to Use Provider
Update all existing LLM logic to use the provider abstraction.

#### 5.1 Update Response Generation
**Files to modify:**
- `src/main/claude.ts` → Use `llmManager.getProvider()` instead of direct Anthropic calls
- `src/main/prompts/response.ts` → No changes needed (prompt generation is backend-agnostic)

The existing `generateResponse()` and `streamResponse()` functions will delegate to the active provider.

#### 5.2 Update Extraction and Context
**Files to modify:**
- `src/main/extraction.ts` → Use `llmManager.getProvider()` for extraction calls
- `src/main/context.ts` → Use `llmManager.getProvider()` for context planning

All LLM operations use the selected backend - no special-casing for extraction or narrative synthesis.

#### 5.3 Update Main Process Initialization
**File:** `src/main/index.ts` (modify)

Initialize LLM manager on app start:
```typescript
import { llmManager } from './llm/manager.js';

// In app.whenReady()
const config = await loadLLMConfig();
await llmManager.initialize(config);
```

### Phase 6: Settings UI
Add backend selection and configuration to the settings panel with a distinctive, intuitive design.

#### 6.1 Design Specifications

**Visual Direction**: Warm, tactile UI that feels like choosing between two paths. Use the app's earth-tone palette with clear visual hierarchy. The experience should feel like "picking your guide" rather than configuring software.

**Backend Selection - Card-Based Chooser**

Instead of a dropdown, display two selectable cards side-by-side:

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  ○ LOCAL                    │  │  ○ CLOUD                    │
│  ┌─────────────────────┐    │  │  ┌─────────────────────┐    │
│  │     🏠 Ollama       │    │  │  │    ☁️ Claude        │    │
│  │                     │    │  │  │                     │    │
│  │   Private & Local   │    │  │  │   Powerful & Fast   │    │
│  └─────────────────────┘    │  │  └─────────────────────┘    │
│                             │  │                             │
│  ● Connected               │  │  ○ Requires API Key          │
│    llama3.2 (7B)            │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘
```

**Card States:**
- **Unselected**: Muted border, slightly faded content
- **Selected**: Accent border (warm brown), subtle glow/shadow, full opacity
- **Hover**: Lift with shadow, border color hint
- **Connected**: Green status dot with model name
- **Disconnected**: Red/amber status dot with error hint

**Ollama Configuration Panel (expands below cards when Ollama selected)**

Progressive disclosure - only show when Ollama is selected:

```
┌─────────────────────────────────────────────────────────────────┐
│  CONNECTION                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ http://localhost:11434                              [Test] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  MODEL                                        ● Connected        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            ││
│  │ │ llama3.2    │ │ mistral     │ │ codellama   │   ...      ││
│  │ │ 7B · 4.1GB  │ │ 7B · 4.0GB  │ │ 13B · 7.3GB │            ││
│  │ │     ✓       │ │             │ │             │            ││
│  │ └─────────────┘ └─────────────┘ └─────────────┘            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  No models? Run: ollama pull llama3.2                           │
└─────────────────────────────────────────────────────────────────┘
```

**Model Cards** (horizontal scrollable row):
- Model name (primary, bold)
- Size info: parameter count · disk size (secondary, muted)
- Selected state: checkmark, accent border
- Hover: subtle lift

**Empty State** (when Ollama connected but no models):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                        📦                                        │
│                                                                  │
│              No models installed yet                             │
│                                                                  │
│         Run this command in your terminal:                       │
│         ┌─────────────────────────────────┐                      │
│         │ ollama pull llama3.2           │  [Copy]              │
│         └─────────────────────────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Error State** (when Ollama not running):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⚠️  Cannot connect to Ollama                                    │
│                                                                  │
│  Make sure Ollama is running:                                    │
│  ┌─────────────────────────────────┐                            │
│  │ ollama serve                    │  [Copy]                    │
│  └─────────────────────────────────┘                            │
│                                                                  │
│  Or install from: https://ollama.ai                             │
│                                               [Retry Connection] │
└─────────────────────────────────────────────────────────────────┘
```

**Claude Configuration Panel (expands when Claude selected)**

Reuse existing ApiKeySetup styling:

```
┌─────────────────────────────────────────────────────────────────┐
│  API KEY                                     ● Configured        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ sk-ant-••••••••••••••••••••••••4a2f              [👁] [✏️] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  🔒 Stored securely in your system keychain                     │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2 Create Backend Settings Component
**File:** `src/renderer/components/BackendSettings.tsx`

```typescript
interface BackendSettingsProps {
  config: LLMConfig;
  status: LLMStatus;
  models: OllamaModel[];
  onConfigChange: (config: Partial<LLMConfig>) => void;
  onTestConnection: () => void;
  onRefreshModels: () => void;
}

export function BackendSettings(props: BackendSettingsProps);
```

Sub-components:
- `BackendCard` - Selectable card for each backend option
- `OllamaConfig` - Connection URL, model grid, status
- `ClaudeConfig` - API key display/edit, status
- `ModelCard` - Individual model selection tile
- `CommandCopy` - Copyable terminal command with button

**Styling Requirements:**
- Use existing theme colors from `useTheme()` hook
- Cards use `theme.colors.surface` with `theme.colors.border`
- Selected state uses `theme.colors.accent` for border
- Status dots: green (#4c8b57), red (#c45a4a), amber (#b8860b)
- Model cards scroll horizontally on overflow
- Smooth transitions (150ms) on all interactive states
- Copy button shows brief "Copied!" feedback

#### 6.3 Update Settings Panel
**File:** `src/renderer/components/SettingsPanel.tsx` (modify)

Add new "AI Backend" section at the TOP of settings (before API Key section):

```typescript
// Section order:
// 1. AI Backend (NEW - most important)
// 2. API Key (existing - now only shows when Claude selected, or always for override)
// 3. Appearance (existing)
// 4. About (existing)
```

The API Key section behavior changes:
- When Ollama is selected: Hide API Key section entirely (not needed)
- When Claude is selected: Show API Key section as before

#### 6.4 Add Backend Indicator to Chat
**File:** `src/renderer/components/ChatPage.tsx` (modify)

Add a subtle, clickable indicator in the chat header area:

```
┌─────────────────────────────────────────────────────────────────┐
│  Know Thyself                              [🏠 Local] [⚙️]      │
└─────────────────────────────────────────────────────────────────┘
```

**Indicator Design:**
- Pill-shaped badge: `[icon] [label]`
- Icon: 🏠 for Ollama, ☁️ for Claude (or simple SVG equivalents)
- Label: "Local" or "Claude"
- Background: subtle, theme-aware (transparent with border)
- Hover: slightly darker background
- Click: opens Settings panel directly to AI Backend section

**Styling:**
```typescript
// Indicator styles
{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
  color: theme.colors.textSecondary,
  background: 'transparent',
  border: `1px solid ${theme.colors.border}`,
  cursor: 'pointer',
  transition: 'all 150ms ease',
}
```

#### 6.5 Auto-Connection Behavior

When the Settings panel opens or backend changes:
1. Immediately show "Checking..." status
2. Auto-test connection in background
3. If Ollama: also fetch model list on successful connection
4. Update status indicator (no manual "Test" required for initial check)

The "Test Connection" button is for manual retry after errors, not initial setup.

### Phase 7: Testing & Polish

#### 7.1 Unit Tests
**File:** `tests/unit/llm-providers.test.ts`

Test provider implementations:
- OllamaProvider connection testing
- OllamaProvider streaming
- ClaudeProvider wrapping
- LLMManager switching

#### 7.2 E2E Test
**File:** `tests/local-llm-ollama.spec.ts`

Test complete flow:
- Change backend in settings
- Verify persistence
- Send message with each backend (mock responses)

---

## Technical Specifications

### Ollama API Format

**List Models:**
```
GET http://localhost:11434/api/tags
Response: { "models": [{ "name": "llama3.2", "size": 2000000000, "modified_at": "..." }] }
```

**Chat (Streaming):**
```
POST http://localhost:11434/api/chat
Body: {
  "model": "llama3.2:70b-instruct-q3_K_M",
  "messages": [
    { "role": "system", "content": "You are helpful" },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "How are you?" }
  ],
  "stream": true
}

Response (NDJSON stream):
{"message":{"role":"assistant","content":"I"},"done":false}
{"message":{"role":"assistant","content":"'m"},"done":false}
{"message":{"role":"assistant","content":" doing"},"done":false}
{"message":{"role":"assistant","content":" well!"},"done":true}
```

### State Flow

```
User selects backend → saveLLMConfig() → llmManager.switchBackend()
                                              ↓
                                    Create new provider instance
                                              ↓
                                    Next chat uses new provider
```

### Shared Types
**File:** `src/shared/types.ts` (modify)

Add types that need to be shared between main and renderer:
```typescript
export type BackendType = 'ollama' | 'claude';
export interface LLMStatus {
  backend: BackendType;
  connected: boolean;
  error?: string;
}
```

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/llm/types.ts` | Provider interface and types |
| `src/main/llm/manager.ts` | LLM provider manager singleton |
| `src/main/llm/ollama.ts` | Ollama provider implementation |
| `src/main/llm/claude.ts` | Claude provider wrapper |
| `src/main/llm/storage.ts` | Backend config persistence |
| `src/renderer/components/BackendSettings.tsx` | Main settings UI with card-based backend selection |
| `src/renderer/components/BackendCard.tsx` | Selectable card component for backend options |
| `src/renderer/components/OllamaConfig.tsx` | Ollama-specific config: URL, model grid, status |
| `src/renderer/components/ModelCard.tsx` | Individual model selection tile |
| `src/renderer/components/CommandCopy.tsx` | Copyable terminal command with feedback |
| `src/renderer/components/BackendIndicator.tsx` | Chat header badge showing current backend |
| `tests/unit/llm-providers.test.ts` | Unit tests for providers |
| `tests/local-llm-ollama.spec.ts` | E2E test for complete flow |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/claude.ts` | Use provider abstraction instead of direct SDK |
| `src/main/extraction.ts` | Use provider abstraction for extraction calls |
| `src/main/context.ts` | Use provider abstraction for context planning |
| `src/main/ipc.ts` | Add LLM config/status IPC handlers |
| `src/main/index.ts` | Initialize LLM manager on startup |
| `src/preload/index.ts` | Expose LLM IPC methods |
| `src/renderer/components/SettingsPanel.tsx` | Integrate BackendSettings |
| `src/renderer/components/ChatPage.tsx` | Add backend indicator |
| `src/shared/types.ts` | Add BackendType and LLMStatus |

---

## Test Plan

### Unit Tests (per User Story)
**File:** `tests/unit/llm-providers.test.ts`

```typescript
describe('US-001: Select LLM Backend', () => {
  it('US-001: LLMManager initializes with default ollama backend', () => { ... });
  it('US-001: LLMManager switches between backends', () => { ... });
  it('US-001: Config persists and reloads correctly', () => { ... });
});

describe('US-002: Configure Ollama Connection', () => {
  it('US-002: OllamaProvider uses configured baseUrl', () => { ... });
  it('US-002: OllamaProvider.listModels fetches from API', () => { ... });
});

describe('US-003: Ollama Connection Status', () => {
  it('US-003: testConnection returns ok:true when Ollama responds', () => { ... });
  it('US-003: testConnection returns ok:false with error on failure', () => { ... });
});

describe('US-004: Chat with Local LLM', () => {
  it('US-004: OllamaProvider.streamText yields chunks', () => { ... });
  it('US-004: OllamaProvider passes system prompt correctly', () => { ... });
});

describe('US-005: Graceful Fallback on Error', () => {
  it('US-005: Provider returns descriptive error on connection failure', () => { ... });
  it('US-005: Shows helpful message when no models available', () => { ... });
});

describe('US-006: Backend Indicator in UI', () => {
  it('US-006: Indicator displays current backend name', () => { ... });
  it('US-006: Clicking indicator opens settings', () => { ... });
});

describe('US-007: Visual Model Selection', () => {
  it('US-007: Models render as cards with name and size', () => { ... });
  it('US-007: Clicking model card selects it', () => { ... });
  it('US-007: Empty state shows pull command with copy button', () => { ... });
});

describe('US-008: Automatic Connection Testing', () => {
  it('US-008: Auto-tests connection when settings opens', () => { ... });
  it('US-008: Shows checking state during test', () => { ... });
  it('US-008: Displays connected/error state after test', () => { ... });
});
```

### E2E Test (for PRD)
**File:** `tests/local-llm-ollama.spec.ts`

```typescript
test.describe('Phase 8: Local LLM Support via Ollama', () => {
  test('US-001/US-002: can switch between backends in settings', async () => {
    // Open settings
    // Verify default is Ollama
    // Switch to Claude
    // Verify Claude settings appear
    // Switch back to Ollama
    // Verify Ollama settings appear
  });

  test('US-004/US-006: chat uses selected backend', async () => {
    // With Ollama selected (mocked)
    // Send message
    // Verify response streams
    // Verify backend indicator shows "Local (Ollama)"
  });
});
```

---

## Quality Gates

- `make check` - All checks pass (typecheck, lint, test, build)
- Unit tests cover all user story acceptance criteria
- E2E test validates complete backend switching flow

### Post-Verification: Code Simplification
After all quality gates pass:
1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run `make check`
3. Repeat until no further simplifications

---

## Verification Checklist

1. [ ] Fresh install → Default backend is "Local (Ollama)"
2. [ ] Settings → Backend dropdown shows both options
3. [ ] Select Ollama → Ollama-specific settings appear
4. [ ] Select Claude → Claude API key field appears, Ollama settings hidden
5. [ ] Ollama running → Status shows "Connected" (green)
6. [ ] Ollama not running → Status shows "Not Running" (red)
7. [ ] Test Connection button → Shows appropriate status
8. [ ] Send message with Ollama → Response streams correctly
9. [ ] Send message with Claude → Response streams correctly
10. [ ] Backend indicator visible in chat UI
11. [ ] Click indicator → Opens settings
12. [ ] Restart app → Backend selection persisted
13. [ ] Ollama unavailable during chat → Shows helpful error with settings link
14. [ ] Extraction runs with Ollama backend → Profile updates after conversation
15. [ ] Configure custom Ollama URL → App connects to specified host
16. [ ] No models available → Shows helpful error with `ollama pull` command
17. [ ] Switch backend mid-conversation → Next message uses new backend
18. [ ] Multiple Ollama models available → Auto-selects first, picker shows all options
19. [ ] Select different model in picker → Subsequent messages use selected model
20. [ ] Backend cards display side-by-side with clear selected state
21. [ ] Model cards show name, size, and parameter count
22. [ ] Model cards scroll horizontally when many models installed
23. [ ] Copy button on terminal commands shows "Copied!" feedback
24. [ ] Connection auto-tests when opening settings or switching backend
25. [ ] Backend indicator badge in chat header is clickable

---

## Implementation Order

1. **Phase 1** - Provider abstraction (types.ts, manager.ts)
2. **Phase 2** - Ollama and Claude provider implementations
3. **Phase 3** - Config storage
4. **Phase 4** - IPC integration
5. **Phase 5** - Refactor existing chat to use providers
6. **Phase 6** - Settings UI
7. **Phase 7** - Testing & polish

---

## Design Decisions

- **Extraction/narrative synthesis**: Use the selected backend (Ollama or Claude) for all LLM operations, including extraction and narrative synthesis. No fallback to Claude.
- **Model selection**: Auto-detect first available model from Ollama. User can override via model picker in settings.
- **Remote Ollama support**: Yes - URL is configurable, defaults to `http://localhost:11434`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ollama not installed | Medium | Clear error message with link to Ollama install docs |
| No models available | Medium | Show error with `ollama pull` command; auto-detect removes manual config burden |
| Response quality differs | Low | Out of scope - user chooses their model |
| Extraction quality with local models | Medium | 70B model should handle structured extraction; monitor JSON parsing errors |
| Streaming format differences | Medium | Normalize in provider implementations |
| Context window limits vary | Low | Cap at reasonable default (4096 tokens) |
