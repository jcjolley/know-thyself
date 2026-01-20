# Phase 4.3: Voice Input

## Overview

Add optional voice input capability using local Whisper transcription for privacy. Users can toggle voice mode on/off with a hotkey or button, speak naturally with VAD-based chunking during pauses, and have their speech transcribed and sent as text input to the chat system.

## Problem Statement

Typing is not always the most natural way to express thoughts, especially during emotional processing or stream-of-consciousness reflection. Voice input:
- Enables more natural, unfiltered expression (speaking is less filtered than typing)
- Reduces friction for longer rambling (which often reveals more psychological signal)
- Works better for users who think out loud or find typing tedious
- Can capture additional metadata (pace, pauses) as supplementary signal

## Goals

- [ ] Capture audio input via microphone with proper permissions handling
- [ ] Detect voice activity to chunk audio at natural pause points (VAD)
- [ ] Transcribe speech locally using Whisper.cpp for privacy
- [ ] Support multiple Whisper models based on hardware (turbo/small/base)
- [ ] Provide toggle-to-talk interaction (not hold-to-talk)
- [ ] Display real-time transcription feedback while user speaks
- [ ] Integrate transcribed text seamlessly with existing chat flow
- [ ] Allow hotkey configuration for voice toggle

## Non-Goals

- Not implementing voice output/text-to-speech (this is input only)
- Not requiring voice input (always optional, text remains primary)
- Not doing advanced voice analytics like emotion detection from tone (future consideration)
- Not supporting continuous listening without explicit toggle (privacy/battery)
- Not bundling FFmpeg with the app (users install it separately if needed)
- Not changing the extraction pipeline (transcribed text is processed like typed text)
- Not persisting voice recordings (transcribe and discard)

---

## User Stories

### US-001: Microphone Permission Request
**As a** user enabling voice input for the first time
**I want** the app to request microphone permission clearly
**So that** I understand why it needs access and can grant it

**Acceptance Criteria:**
- [ ] Given voice mode is toggled on, when microphone permission is not granted, then display a permission request dialog
- [ ] Given the user denies permission, when they try to enable voice mode, then show a friendly message explaining the requirement
- [ ] Given permission is granted, when voice mode is toggled on, then audio capture begins immediately
- [ ] Permission status is cached and re-checked on app restart

### US-002: Toggle Voice Mode On/Off
**As a** user
**I want** to toggle voice input mode with a button or hotkey
**So that** I have clear control over when my microphone is active

**Acceptance Criteria:**
- [ ] Given voice mode is off, when user clicks the voice button OR presses the hotkey (default: Ctrl+Shift+V), then voice mode activates
- [ ] Given voice mode is on, when user clicks the voice button OR presses the hotkey, then voice mode deactivates
- [ ] Given voice mode is active, then display a clear visual indicator (pulsing microphone icon)
- [ ] Given voice mode is active for > 60 seconds of silence, then auto-deactivate with a notification

### US-003: Voice Activity Detection
**As a** user speaking into the microphone
**I want** the system to detect when I pause naturally
**So that** transcription happens in chunks without cutting off my sentences

**Acceptance Criteria:**
- [ ] Given VAD threshold is set (default: 1.5s), when user pauses longer than threshold, then that chunk is sent for transcription
- [ ] Given user continues speaking after a pause, when transcription completes, then results are stitched together
- [ ] Given user speaks continuously for 25+ seconds, when max chunk duration is reached, then force-chunk without cutting mid-word
- [ ] VAD sensitivity is configurable in settings

### US-004: Whisper Model Selection
**As a** user with varying hardware
**I want** the system to select an appropriate Whisper model
**So that** I get the best quality my hardware can handle

**Acceptance Criteria:**
- [ ] Given 6GB+ VRAM available, when transcription initializes, then use `whisper-large-v3-turbo` model
- [ ] Given 2-4GB VRAM available, when transcription initializes, then use `whisper-small` model
- [ ] Given CPU-only or <2GB VRAM, when transcription initializes, then use `whisper-base` model
- [ ] User can override automatic model selection in settings
- [ ] Model download progress is shown on first use

### US-005: Real-Time Transcription Display
**As a** user speaking
**I want** to see my words appearing as I speak
**So that** I know the system is working and can catch any errors

**Acceptance Criteria:**
- [ ] Given voice mode is active and user is speaking, when VAD detects speech, then show "Listening..." indicator
- [ ] Given a chunk is sent to Whisper, when transcription completes, then display partial transcript in input area
- [ ] Given multiple chunks are transcribed, then display accumulated text with proper spacing
- [ ] Given transcription errors occur, then show error message without losing previous text

### US-006: Send Transcribed Message
**As a** user who has finished speaking
**I want** the transcribed text to be sent to the chat
**So that** I can continue my conversation naturally

**Acceptance Criteria:**
- [ ] Given voice mode is active with accumulated transcript, when user toggles voice off, then transcript is placed in input field
- [ ] Given transcript is in input field, when user presses Enter or clicks Send, then message is sent normally
- [ ] Given extended silence (>5s after last speech), when auto-send is enabled, then automatically send accumulated transcript
- [ ] User can edit the transcript before sending

### US-007: Hotkey Configuration
**As a** user
**I want** to configure my voice toggle hotkey
**So that** I can use a key combination that works for me

**Acceptance Criteria:**
- [ ] Given settings page is open, when user navigates to Voice Input section, then current hotkey is displayed
- [ ] Given user clicks "Change Hotkey", when they press a new key combination, then it is captured and saved
- [ ] Invalid combinations (single letter keys, system-reserved combos) are rejected with explanation
- [ ] Hotkey persists across app restarts

### US-008: Graceful Degradation
**As a** user without FFmpeg or with limited hardware
**I want** clear feedback about what's available
**So that** I understand if voice input won't work and why

**Acceptance Criteria:**
- [ ] Given FFmpeg is not installed, when user enables voice input, then show message with installation instructions
- [ ] Given Whisper model fails to load, when user enables voice input, then show specific error and fallback options
- [ ] Given system has no microphone, when voice button is shown, then it is disabled with tooltip explanation

---

## Phases

### Phase 1: Audio Infrastructure

Set up the core audio capture and processing pipeline.

#### 1.1 Audio Capture Module
**File:** `src/main/audio/capture.ts`

Handle microphone permissions and audio stream capture using Web Audio API in the renderer and pass PCM data to main process.

```typescript
export interface AudioCaptureState {
    isCapturing: boolean;
    hasPermission: boolean;
    error: string | null;
}

export interface AudioChunk {
    pcmData: Float32Array;
    sampleRate: number;
    timestamp: number;
    durationMs: number;
}

// Request microphone permission
export async function requestMicrophonePermission(): Promise<boolean>;

// Start capturing audio
export async function startCapture(): Promise<void>;

// Stop capturing audio
export function stopCapture(): void;

// Get current capture state
export function getCaptureState(): AudioCaptureState;
```

#### 1.2 VAD Integration
**File:** `src/main/audio/vad.ts`

Integrate Voice Activity Detection to chunk audio at natural pauses.

```typescript
export interface VADConfig {
    silenceThresholdMs: number;  // Default: 1500ms
    maxChunkDurationMs: number;  // Default: 25000ms
    minChunkDurationMs: number;  // Default: 500ms
    speechProbabilityThreshold: number;  // Default: 0.5
}

export interface VADResult {
    isSpeech: boolean;
    probability: number;
    shouldChunk: boolean;
    silenceDurationMs: number;
}

// Initialize VAD with config
export function initVAD(config?: Partial<VADConfig>): Promise<void>;

// Process audio frame through VAD
export function processFrame(frame: Float32Array): VADResult;

// Reset VAD state (between sessions)
export function resetVAD(): void;
```

#### 1.3 Audio Buffer Management
**File:** `src/main/audio/buffer.ts`

Manage audio buffering for chunk assembly before transcription.

```typescript
export interface AudioBuffer {
    frames: Float32Array[];
    totalDurationMs: number;
    startTimestamp: number;
}

// Add frame to buffer
export function addFrame(frame: Float32Array, durationMs: number): void;

// Get and clear current buffer (when chunk is ready)
export function flushBuffer(): AudioChunk | null;

// Clear buffer without returning (on cancel)
export function clearBuffer(): void;

// Get current buffer duration
export function getBufferDuration(): number;
```

### Phase 2: Whisper Integration

Set up local Whisper transcription with model management.

#### 2.1 Whisper Service
**File:** `src/main/audio/whisper.ts`

Core transcription service using whisper-node (Whisper.cpp bindings).

```typescript
export type WhisperModel = 'base' | 'small' | 'large-v3-turbo';

export interface WhisperConfig {
    model: WhisperModel;
    language: string;  // Default: 'en'
    translateToEnglish: boolean;  // Default: false
}

export interface TranscriptionResult {
    text: string;
    segments: TranscriptionSegment[];
    processingTimeMs: number;
}

export interface TranscriptionSegment {
    start: number;
    end: number;
    text: string;
}

// Initialize Whisper with model
export async function initWhisper(config?: Partial<WhisperConfig>): Promise<void>;

// Transcribe an audio chunk
export async function transcribe(chunk: AudioChunk): Promise<TranscriptionResult>;

// Get current model info
export function getModelInfo(): { model: WhisperModel; ready: boolean };

// Check if Whisper is ready
export function isReady(): boolean;
```

#### 2.2 Model Manager
**File:** `src/main/audio/model-manager.ts`

Handle model download, storage, and hardware-based selection.

```typescript
export interface ModelInfo {
    name: WhisperModel;
    size: string;
    minVRAM: number;  // in GB
    quality: 'excellent' | 'good' | 'acceptable';
    path: string | null;  // null if not downloaded
}

export interface HardwareInfo {
    hasGPU: boolean;
    vramGB: number | null;
    cpuCores: number;
}

// Detect available hardware
export async function detectHardware(): Promise<HardwareInfo>;

// Get recommended model based on hardware
export function getRecommendedModel(hardware: HardwareInfo): WhisperModel;

// Check if model is downloaded
export function isModelDownloaded(model: WhisperModel): boolean;

// Download model with progress callback
export async function downloadModel(
    model: WhisperModel,
    onProgress: (percent: number) => void
): Promise<string>;

// Get model path
export function getModelPath(model: WhisperModel): string | null;
```

#### 2.3 Audio Preprocessing
**File:** `src/main/audio/preprocess.ts`

Convert audio to format required by Whisper (16kHz mono PCM).

```typescript
// Resample audio to 16kHz mono
export function resampleTo16kMono(
    input: Float32Array,
    inputSampleRate: number
): Float32Array;

// Convert Float32Array to WAV format buffer
export function toWavBuffer(
    samples: Float32Array,
    sampleRate: number
): Buffer;

// Normalize audio levels
export function normalizeAudio(samples: Float32Array): Float32Array;
```

### Phase 3: Transcription Pipeline

Build the end-to-end transcription pipeline connecting audio capture to text output.

#### 3.1 Transcription Controller
**File:** `src/main/audio/transcription-controller.ts`

Orchestrate the full transcription pipeline.

```typescript
export interface TranscriptionState {
    isActive: boolean;
    isProcessing: boolean;
    currentTranscript: string;
    pendingChunks: number;
    lastError: string | null;
}

export interface TranscriptionEvents {
    onPartialTranscript: (text: string, isFinal: boolean) => void;
    onStateChange: (state: TranscriptionState) => void;
    onError: (error: string) => void;
}

// Start transcription session
export function startTranscription(events: TranscriptionEvents): void;

// Stop transcription session and get final result
export function stopTranscription(): Promise<string>;

// Cancel transcription (discard pending)
export function cancelTranscription(): void;

// Get current state
export function getTranscriptionState(): TranscriptionState;
```

#### 3.2 IPC Handlers for Voice
**File:** `src/main/ipc.ts` (extend)

Add IPC handlers for voice-related operations.

```typescript
// New IPC channels to register:
// 'voice:checkPermission' -> Promise<boolean>
// 'voice:requestPermission' -> Promise<boolean>
// 'voice:start' -> void (triggers streaming events)
// 'voice:stop' -> Promise<string> (returns final transcript)
// 'voice:cancel' -> void
// 'voice:getState' -> Promise<VoiceState>
// 'voice:getModelInfo' -> Promise<ModelInfo>
// 'voice:downloadModel' -> void (triggers progress events)
// 'voice:setConfig' -> Promise<void>
// 'voice:getConfig' -> Promise<VoiceConfig>

// New events emitted:
// 'voice:partial' -> { text: string, isFinal: boolean }
// 'voice:stateChange' -> VoiceState
// 'voice:error' -> string
// 'voice:downloadProgress' -> { model: string, percent: number }
```

### Phase 4: UI Integration

Build the UI components for voice input.

#### 4.1 Voice Input Button
**File:** `src/renderer/components/VoiceInputButton.tsx`

The main voice toggle button displayed in the chat input area.

```typescript
interface VoiceInputButtonProps {
    disabled?: boolean;
    onTranscript: (text: string) => void;
}

// States to display:
// - Idle (mic icon, clickable)
// - Active/Listening (pulsing mic, red indicator)
// - Processing (spinner, partial text shown)
// - Error (error icon with tooltip)
// - Disabled (greyed out with tooltip)
```

#### 4.2 Voice Status Indicator
**File:** `src/renderer/components/VoiceStatusIndicator.tsx`

Visual feedback for current voice capture state.

```typescript
interface VoiceStatusIndicatorProps {
    state: 'idle' | 'listening' | 'processing' | 'error';
    partialTranscript?: string;
    errorMessage?: string;
}
```

#### 4.3 Update Chat Page
**File:** `src/renderer/components/ChatPage.tsx`

Integrate voice input with existing chat flow.

**Changes:**
- Add `VoiceInputButton` next to text input area
- Handle transcript insertion into input field
- Support auto-send option after voice input completes
- Update keyboard shortcut hint to include voice hotkey

#### 4.4 Preload API Extension
**File:** `src/preload/index.ts`

Expose voice IPC to renderer.

```typescript
interface VoiceAPI {
    checkPermission: () => Promise<boolean>;
    requestPermission: () => Promise<boolean>;
    start: () => void;
    stop: () => Promise<string>;
    cancel: () => void;
    getState: () => Promise<VoiceState>;
    getConfig: () => Promise<VoiceConfig>;
    setConfig: (config: Partial<VoiceConfig>) => Promise<void>;
    onPartial: (callback: (data: { text: string; isFinal: boolean }) => void) => void;
    onStateChange: (callback: (state: VoiceState) => void) => void;
    onError: (callback: (error: string) => void) => void;
    removeAllListeners: () => void;
}
```

### Phase 5: Settings & Configuration

Add settings UI for voice input configuration.

#### 5.1 Voice Settings Section
**File:** `src/renderer/components/Settings/VoiceSettings.tsx`

Settings panel for voice input configuration.

```typescript
interface VoiceSettingsProps {
    config: VoiceConfig;
    onConfigChange: (config: Partial<VoiceConfig>) => void;
}

// Settings to expose:
// - Enable/disable voice input feature
// - Hotkey configuration
// - Whisper model selection (with hardware recommendation)
// - VAD sensitivity (silence threshold)
// - Auto-send after speech ends toggle
// - Language selection
```

#### 5.2 Voice Configuration Types
**File:** `src/shared/types.ts` (extend)

Add voice-related types to shared types.

```typescript
export interface VoiceConfig {
    enabled: boolean;
    hotkey: string;  // e.g., "Ctrl+Shift+V"
    model: WhisperModel;
    language: string;
    vadSilenceThresholdMs: number;
    autoSendAfterSpeech: boolean;
    autoSendDelayMs: number;
}

export interface VoiceState {
    isAvailable: boolean;  // Has permission, model ready
    isActive: boolean;     // Currently capturing
    isProcessing: boolean; // Transcription in progress
    currentTranscript: string;
    error: string | null;
}
```

#### 5.3 Settings Persistence
**File:** `src/main/db/sqlite.ts` (extend)

Add voice settings to SQLite schema.

```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Voice settings stored as JSON:
-- key: 'voice_config'
-- value: JSON string of VoiceConfig
```

### Phase 6: Testing

Comprehensive tests for voice input functionality.

#### 6.1 Audio Processing Tests
**File:** `tests/audio-processing.spec.ts`

Test VAD, resampling, and buffer management.

#### 6.2 Transcription Tests
**File:** `tests/transcription.spec.ts`

Test Whisper integration and model management.

#### 6.3 Voice UI Tests
**File:** `tests/voice-input.spec.ts`

Test voice button, state transitions, and chat integration.

---

## Technical Specifications

### Data Models

```typescript
// Voice configuration (persisted in settings)
export interface VoiceConfig {
    enabled: boolean;
    hotkey: string;
    model: WhisperModel;
    language: string;
    vadSilenceThresholdMs: number;
    autoSendAfterSpeech: boolean;
    autoSendDelayMs: number;
}

// Runtime voice state
export interface VoiceState {
    isAvailable: boolean;
    isActive: boolean;
    isProcessing: boolean;
    currentTranscript: string;
    error: string | null;
}

// Model information
export interface WhisperModelInfo {
    name: WhisperModel;
    displayName: string;
    size: string;
    minVRAM: number;
    downloaded: boolean;
    path: string | null;
}
```

### IPC Channels

| Channel | Direction | Pattern | Purpose |
|---------|-----------|---------|---------|
| `voice:checkPermission` | R->M | invoke/handle | Check if mic permission granted |
| `voice:requestPermission` | R->M | invoke/handle | Request mic permission |
| `voice:start` | R->M | send/on | Start voice capture |
| `voice:stop` | R->M | invoke/handle | Stop capture, get transcript |
| `voice:cancel` | R->M | send/on | Cancel capture, discard |
| `voice:getState` | R->M | invoke/handle | Get current voice state |
| `voice:getConfig` | R->M | invoke/handle | Get voice settings |
| `voice:setConfig` | R->M | invoke/handle | Update voice settings |
| `voice:partial` | M->R | reply | Partial transcription |
| `voice:stateChange` | M->R | reply | State change notification |
| `voice:error` | M->R | reply | Error notification |
| `voice:downloadProgress` | M->R | reply | Model download progress |

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `whisper-node` | ^1.0.0 | Whisper.cpp bindings for Node.js |
| `@ricky0123/vad-web` | ^0.0.7 | Voice Activity Detection |
| `systeminformation` | ^5.21.0 | Hardware detection (VRAM) |

**External Dependencies (user-installed):**
- FFmpeg (for audio format conversion if needed)

### Model Storage

| Model | Size | Location |
|-------|------|----------|
| whisper-base | ~140MB | `{userData}/models/whisper-base/` |
| whisper-small | ~460MB | `{userData}/models/whisper-small/` |
| whisper-large-v3-turbo | ~1.5GB | `{userData}/models/whisper-large-v3-turbo/` |

### Audio Format Pipeline

```
Microphone (44.1kHz/48kHz stereo)
    -> Web Audio API capture (Float32Array)
    -> IPC to main process
    -> Resample to 16kHz mono
    -> VAD processing (chunk on pause)
    -> Whisper transcription
    -> Text result
```

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/main/audio/capture.ts` | Microphone permission and audio capture coordination |
| `src/main/audio/vad.ts` | Voice Activity Detection integration |
| `src/main/audio/buffer.ts` | Audio buffer management for chunking |
| `src/main/audio/whisper.ts` | Whisper transcription service |
| `src/main/audio/model-manager.ts` | Model download and hardware detection |
| `src/main/audio/preprocess.ts` | Audio format conversion utilities |
| `src/main/audio/transcription-controller.ts` | Pipeline orchestration |
| `src/renderer/components/VoiceInputButton.tsx` | Voice toggle button component |
| `src/renderer/components/VoiceStatusIndicator.tsx` | Voice state feedback component |
| `src/renderer/components/Settings/VoiceSettings.tsx` | Voice settings panel |
| `tests/audio-processing.spec.ts` | Audio processing tests |
| `tests/transcription.spec.ts` | Transcription tests |
| `tests/voice-input.spec.ts` | Voice UI integration tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/main/ipc.ts` | Add voice-related IPC handlers |
| `src/main/index.ts` | Initialize voice services |
| `src/preload/index.ts` | Expose voice API to renderer |
| `src/renderer/components/ChatPage.tsx` | Add voice button, handle transcript |
| `src/shared/types.ts` | Add VoiceConfig, VoiceState, related types |
| `src/main/db/sqlite.ts` | Add settings table for voice config |
| `package.json` | Add whisper-node, vad-web, systeminformation dependencies |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new voice tests)
- `make build` - Build succeeds

### Post-Verification: Code Simplification

After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

1. [ ] Voice button appears in chat input area
2. [ ] Clicking voice button requests microphone permission (first time)
3. [ ] After permission granted, clicking voice button starts capture (visual indicator)
4. [ ] Speaking into microphone shows "Listening..." state
5. [ ] Pausing for 1.5s triggers transcription (partial text appears)
6. [ ] Continuing to speak accumulates more transcript
7. [ ] Clicking voice button again stops capture and puts text in input
8. [ ] Pressing Enter sends the transcribed message normally
9. [ ] Hotkey (Ctrl+Shift+V) toggles voice mode
10. [ ] Settings allow changing model, hotkey, VAD sensitivity
11. [ ] Model downloads with progress indicator on first use
12. [ ] Error states display clearly (no mic, model fail, etc.)
13. [ ] Extended silence auto-deactivates voice mode
14. [ ] Transcribed messages are extracted like typed messages

---

## Implementation Order

1. Add dependencies to `package.json` (whisper-node, vad-web, systeminformation)
2. Create `src/main/audio/preprocess.ts` with audio conversion utilities
3. Create `src/main/audio/buffer.ts` for audio chunk management
4. Create `src/main/audio/vad.ts` with VAD integration
5. Create `src/main/audio/model-manager.ts` for hardware detection and model management
6. Create `src/main/audio/whisper.ts` for Whisper transcription service
7. Create `src/main/audio/capture.ts` for microphone handling
8. Create `src/main/audio/transcription-controller.ts` to orchestrate pipeline
9. Add voice IPC handlers to `src/main/ipc.ts`
10. Update `src/main/index.ts` to initialize voice services
11. Add VoiceConfig, VoiceState types to `src/shared/types.ts`
12. Expose voice API in `src/preload/index.ts`
13. Create `src/renderer/components/VoiceInputButton.tsx`
14. Create `src/renderer/components/VoiceStatusIndicator.tsx`
15. Update `src/renderer/components/ChatPage.tsx` with voice integration
16. Create `src/renderer/components/Settings/VoiceSettings.tsx`
17. Add settings persistence to `src/main/db/sqlite.ts`
18. Write tests for audio processing, transcription, and UI
19. Run `make check` and fix any issues
20. Run code simplifier and re-verify

---

## Open Questions

- [ ] Should we support languages other than English? (Currently: yes, language selection in settings)
- [ ] Should voice metadata (pace, pauses) be passed to extraction for additional signal? (Future enhancement)
- [ ] What's the best UX for model download - blocking or background? (Currently: show progress, non-blocking)
- [ ] Should auto-send be on by default? (Currently: off, user must explicitly enable)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Whisper model size causes slow startup | Medium | Lazy-load model on first voice use, not app startup |
| VAD false positives (chunking mid-sentence) | Medium | Conservative defaults, user-adjustable sensitivity |
| Hardware detection inaccurate | Low | Allow manual model override in settings |
| FFmpeg dependency causes install friction | Medium | Auto-detect, show clear instructions, most features work without it |
| Whisper-node native module compatibility | High | Test on Windows/Mac/Linux, document Node.js version requirements |
| Audio capture fails on some systems | Medium | Graceful degradation, clear error messages, voice is optional |
| Large model downloads fail mid-download | Low | Resume capability, retry logic, show download progress |
