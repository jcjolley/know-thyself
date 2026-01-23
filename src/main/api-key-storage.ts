import fs from 'fs';
import path from 'path';
import { paths } from './paths.js';

// Detect if running in Electron
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

// Lazy-load Electron modules only when in Electron environment
let safeStorage: { isEncryptionAvailable: () => boolean; encryptString: (s: string) => Buffer; decryptString: (b: Buffer) => string } | null = null;
if (isElectron) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const electron = require('electron');
        safeStorage = electron.safeStorage;
    } catch {
        // Not in Electron
    }
}

const KEY_FILE = 'api-key.enc';
const KEY_FILE_PLAIN = 'api-key.txt'; // For non-Electron mode (less secure)

export interface ApiKeyStatus {
    hasKey: boolean;
    source: 'stored' | 'env' | 'none';
    maskedKey: string | null;  // e.g., "••••••••abcd"
    encryptionAvailable: boolean;
}

function getKeyPath(): string {
    return path.join(paths.dataDir, isElectron ? KEY_FILE : KEY_FILE_PLAIN);
}

function maskKey(key: string): string {
    if (key.length <= 8) {
        return '••••••••';
    }
    const lastFour = key.slice(-4);
    return '••••••••' + lastFour;
}

/**
 * Check if API key is available from any source.
 * Priority: env var > stored key
 */
export function getApiKeyStatus(): ApiKeyStatus {
    const encryptionAvailable = safeStorage?.isEncryptionAvailable() ?? false;

    // Check environment variable first
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
        return {
            hasKey: true,
            source: 'env',
            maskedKey: maskKey(envKey),
            encryptionAvailable,
        };
    }

    // Check stored key
    const storedKey = loadStoredKey();
    if (storedKey) {
        return {
            hasKey: true,
            source: 'stored',
            maskedKey: maskKey(storedKey),
            encryptionAvailable,
        };
    }

    return {
        hasKey: false,
        source: 'none',
        maskedKey: null,
        encryptionAvailable,
    };
}

/**
 * Get the actual API key (for internal use only).
 * Returns null if no key is configured.
 */
export function getApiKey(): string | null {
    // Priority: env var > stored key
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
        return envKey;
    }

    return loadStoredKey();
}

/**
 * Load stored key from file (encrypted in Electron, plain text otherwise).
 */
function loadStoredKey(): string | null {
    const keyPath = getKeyPath();

    if (!fs.existsSync(keyPath)) {
        return null;
    }

    try {
        if (isElectron && safeStorage) {
            // Electron: decrypt the stored key
            const encrypted = fs.readFileSync(keyPath);
            return safeStorage.decryptString(encrypted);
        } else {
            // Non-Electron: read plain text (less secure, but works for Docker)
            return fs.readFileSync(keyPath, 'utf-8').trim();
        }
    } catch (error) {
        console.error('Failed to load stored API key:', error);
        return null;
    }
}

/**
 * Validate API key format.
 */
export function validateApiKeyFormat(key: string): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
        return { valid: false, error: 'API key is required' };
    }

    const trimmedKey = key.trim();

    if (!trimmedKey.startsWith('sk-ant-')) {
        return { valid: false, error: 'API key must start with sk-ant-' };
    }

    if (trimmedKey.length < 40) {
        return { valid: false, error: 'API key appears too short' };
    }

    return { valid: true };
}

/**
 * Save API key (encrypted in Electron, plain text otherwise).
 */
export function saveApiKey(key: string): { success: boolean; error?: string } {
    const trimmedKey = key.trim();

    const validation = validateApiKeyFormat(trimmedKey);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const keyPath = getKeyPath();

    // Ensure data directory exists
    const dir = path.dirname(keyPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        if (isElectron && safeStorage) {
            // Electron: encrypt and store
            if (!safeStorage.isEncryptionAvailable()) {
                console.warn('Encryption not available - key will be stored with reduced security');
            }
            const encrypted = safeStorage.encryptString(trimmedKey);
            fs.writeFileSync(keyPath, encrypted);
        } else {
            // Non-Electron: store plain text (for Docker - file permissions should protect it)
            console.warn('Running without Electron - API key stored without encryption');
            fs.writeFileSync(keyPath, trimmedKey, { mode: 0o600 }); // Read/write for owner only
        }
        console.log('API key saved successfully');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to save API key:', message);
        return { success: false, error: `Failed to save key: ${message}` };
    }
}

/**
 * Remove stored API key.
 */
export function clearApiKey(): boolean {
    const keyPath = getKeyPath();

    if (!fs.existsSync(keyPath)) {
        return true; // Already cleared
    }

    try {
        fs.unlinkSync(keyPath);
        console.log('API key cleared');
        return true;
    } catch (error) {
        console.error('Failed to clear API key:', error);
        return false;
    }
}
